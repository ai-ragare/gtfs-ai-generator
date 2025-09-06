const axios = require('axios');
const distance = require('@turf/distance').default;
const { point } = require('@turf/helpers');
const polyline = require('polyline');
const logger = require('../config/logger');

class OSMService {
  constructor() {
    this.osrmBaseUrl = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';
    this.nominatimBaseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
    this.userAgent = process.env.OSM_USER_AGENT || 'gtfs-ai-generator/1.0';
    this.defaultProfile = process.env.DEFAULT_ROUTING_PROFILE || 'driving';
    this.maxWaypoints = parseInt(process.env.MAX_WAYPOINTS) || 25;
    this.routingTimeout = parseInt(process.env.ROUTING_TIMEOUT) || 30000;

    // Configurar axios con headers por defecto
    this.httpClient = axios.create({
      timeout: this.routingTimeout,
      headers: {
        'User-Agent': this.userAgent
      }
    });
  }

  /**
   * Geocoding: Convierte una dirección en coordenadas lat/lon
   * @param {string} address - Dirección a geocodificar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - {lat, lon, display_name, importance}
   */
  async geocoding(address, options = {}) {
    try {
      const params = {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        ...options
      };

      logger.info(`Geocoding: ${address}`);
      
      const response = await this.httpClient.get(`${this.nominatimBaseUrl}/search`, {
        params
      });

      if (!response.data || response.data.length === 0) {
        throw new Error(`No se encontraron resultados para: ${address}`);
      }

      const result = response.data[0];
      const coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        importance: result.importance || 0,
        type: result.type,
        class: result.class,
        address: result.address || {}
      };

      logger.info(`Geocoding exitoso: ${coordinates.lat}, ${coordinates.lon}`);
      return coordinates;

    } catch (error) {
      logger.error(`Error en geocoding para "${address}":`, error.message);
      throw new Error(`Error geocodificando "${address}": ${error.message}`);
    }
  }

  /**
   * Geocoding con múltiples candidatos: Devuelve varios resultados posibles
   * @param {string} address - Dirección a geocodificar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Array>} - Array de candidatos con información detallada
   */
  async geocodingCandidates(address, options = {}) {
    try {
      const params = {
        q: address,
        format: 'json',
        limit: options.limit || 10, // Por defecto 10 candidatos
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        ...options
      };

      logger.info(`Geocoding candidatos: ${address} (límite: ${params.limit})`);
      
      const response = await this.httpClient.get(`${this.nominatimBaseUrl}/search`, {
        params
      });

      if (!response.data || response.data.length === 0) {
        throw new Error(`No se encontraron resultados para: ${address}`);
      }

      const candidates = response.data.map((result, index) => ({
        rank: index + 1,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        importance: result.importance || 0,
        type: result.type,
        class: result.class,
        address: result.address || {},
        boundingbox: result.boundingbox || [],
        place_id: result.place_id,
        osm_type: result.osm_type,
        osm_id: result.osm_id,
        confidence: this.calculateConfidence(result, address)
      }));

      // Ordenar por importancia y confianza
      candidates.sort((a, b) => {
        const scoreA = (a.importance * 0.7) + (a.confidence * 0.3);
        const scoreB = (b.importance * 0.7) + (b.confidence * 0.3);
        return scoreB - scoreA;
      });

      logger.info(`Geocoding candidatos exitoso: ${candidates.length} resultados`);
      return candidates;

    } catch (error) {
      logger.error(`Error en geocoding candidatos para "${address}":`, error.message);
      throw new Error(`Error geocodificando candidatos para "${address}": ${error.message}`);
    }
  }

  /**
   * Geocoding inverso: Convierte coordenadas en dirección
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @returns {Promise<Object>} - Información de la dirección
   */
  async reverseGeocoding(lat, lon) {
    try {
      const params = {
        lat: lat,
        lon: lon,
        format: 'json',
        addressdetails: 1,
        extratags: 1
      };

      logger.info(`Reverse geocoding: ${lat}, ${lon}`);
      
      const response = await this.httpClient.get(`${this.nominatimBaseUrl}/reverse`, {
        params
      });

      if (!response.data) {
        throw new Error(`No se encontró información para las coordenadas: ${lat}, ${lon}`);
      }

      const result = response.data;
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address || {},
        type: result.type,
        class: result.class
      };

    } catch (error) {
      logger.error(`Error en reverse geocoding para ${lat}, ${lon}:`, error.message);
      throw new Error(`Error en reverse geocoding: ${error.message}`);
    }
  }

  /**
   * Routing: Calcula ruta entre puntos usando OSRM
   * @param {Array} coordinates - Array de coordenadas [{lat, lon}, ...]
   * @param {Object} options - Opciones de routing
   * @returns {Promise<Object>} - Información de la ruta
   */
  async routing(coordinates, options = {}) {
    try {
      if (!coordinates || coordinates.length < 2) {
        throw new Error('Se requieren al menos 2 coordenadas para routing');
      }

      if (coordinates.length > this.maxWaypoints) {
        throw new Error(`Máximo ${this.maxWaypoints} waypoints permitidos`);
      }

      const profile = options.profile || this.defaultProfile;
      const overview = options.overview || 'full';
      const geometries = options.geometries || 'polyline6';
      const steps = options.steps || false;

      // Formatear coordenadas para OSRM (lon,lat)
      const coordinatesString = coordinates
        .map(coord => `${coord.lon},${coord.lat}`)
        .join(';');

      const params = {
        overview,
        geometries,
        steps,
        alternatives: options.alternatives || false,
        continue_straight: options.continue_straight || 'default'
      };

      logger.info(`Routing: ${coordinates.length} puntos, perfil: ${profile}`);
      
      const response = await this.httpClient.get(
        `${this.osrmBaseUrl}/route/v1/${profile}/${coordinatesString}`,
        { params }
      );

      if (!response.data || !response.data.routes || response.data.routes.length === 0) {
        throw new Error('No se encontró ruta válida');
      }

      const route = response.data.routes[0];
      const routeInfo = {
        distance: route.distance, // metros
        duration: route.duration, // segundos
        geometry: route.geometry, // polyline encoded
        coordinates: this.decodePolyline(route.geometry),
        legs: route.legs || [],
        waypoints: response.data.waypoints || []
      };

      logger.info(`Routing exitoso: ${routeInfo.distance}m, ${routeInfo.duration}s`);
      return routeInfo;

    } catch (error) {
      logger.error('Error en routing:', error.message);
      throw new Error(`Error calculando ruta: ${error.message}`);
    }
  }

  /**
   * Routing con waypoints intermedios
   * @param {Object} origin - {lat, lon}
   * @param {Object} destination - {lat, lon}
   * @param {Array} waypoints - [{lat, lon}, ...]
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Información de la ruta
   */
  async routingWithWaypoints(origin, destination, waypoints = [], options = {}) {
    const allCoordinates = [origin, ...waypoints, destination];
    return await this.routing(allCoordinates, options);
  }

  /**
   * Decodifica polyline de OSRM a coordenadas
   * @param {string} polylineString - Polyline codificado
   * @returns {Array} - Array de coordenadas [{lat, lon}, ...]
   */
  decodePolyline(polylineString) {
    try {
      const decoded = polyline.decode(polylineString);
      return decoded.map(coord => ({
        lat: coord[0],
        lon: coord[1]
      }));
    } catch (error) {
      logger.error('Error decodificando polyline:', error.message);
      return [];
    }
  }

  /**
   * Calcula distancia entre dos puntos usando Turf.js
   * @param {Object} point1 - {lat, lon}
   * @param {Object} point2 - {lat, lon}
   * @param {string} units - Unidades ('kilometers', 'meters', 'miles')
   * @returns {number} - Distancia en las unidades especificadas
   */
  calculateDistance(point1, point2, units = 'kilometers') {
    try {
      const from = point([point1.lon, point1.lat]);
      const to = point([point2.lon, point2.lat]);
      return distance(from, to, { units });
    } catch (error) {
      logger.error('Error calculando distancia:', error.message);
      return 0;
    }
  }

  /**
   * Estima tiempo de viaje basado en distancia y tipo de transporte
   * @param {Object} route - Información de ruta de OSRM
   * @param {string} transportType - Tipo de transporte
   * @returns {number} - Tiempo estimado en minutos
   */
  estimateTravelTime(route, transportType = 'bus') {
    try {
      // Si tenemos duración de OSRM, la usamos
      if (route.duration) {
        return Math.round(route.duration / 60); // convertir a minutos
      }

      // Si no, estimamos basado en distancia y tipo de transporte
      const distanceKm = route.distance / 1000;
      const averageSpeeds = {
        bus: 25,        // km/h en ciudad
        subway: 35,     // km/h metro
        tram: 20,       // km/h tranvía
        ferry: 15,      // km/h ferry
        walking: 5      // km/h caminando
      };

      const speed = averageSpeeds[transportType] || 25;
      const timeHours = distanceKm / speed;
      return Math.round(timeHours * 60); // convertir a minutos

    } catch (error) {
      logger.error('Error estimando tiempo de viaje:', error.message);
      return 30; // fallback a 30 minutos
    }
  }

  /**
   * Genera shape GTFS a partir de coordenadas de ruta
   * @param {Array} coordinates - Array de coordenadas [{lat, lon}, ...]
   * @param {string} shapeId - ID del shape
   * @returns {Array} - Array de puntos shape para GTFS
   */
  generateShape(coordinates, shapeId) {
    try {
      if (!coordinates || coordinates.length === 0) {
        throw new Error('Se requieren coordenadas para generar shape');
      }

      const shapePoints = coordinates.map((coord, index) => ({
        shape_id: shapeId,
        shape_pt_lat: coord.lat,
        shape_pt_lon: coord.lon,
        shape_pt_sequence: index + 1,
        shape_dist_traveled: this.calculateShapeDistance(coordinates, index)
      }));

      logger.info(`Shape generado: ${shapePoints.length} puntos para ${shapeId}`);
      return shapePoints;

    } catch (error) {
      logger.error('Error generando shape:', error.message);
      throw error;
    }
  }

  /**
   * Calcula distancia acumulada para un punto en el shape
   * @param {Array} coordinates - Todas las coordenadas
   * @param {number} pointIndex - Índice del punto actual
   * @returns {number} - Distancia acumulada en metros
   */
  calculateShapeDistance(coordinates, pointIndex) {
    if (pointIndex === 0) return 0;

    let totalDistance = 0;
    for (let i = 1; i <= pointIndex; i++) {
      const prevPoint = coordinates[i - 1];
      const currentPoint = coordinates[i];
      const segmentDistance = this.calculateDistance(prevPoint, currentPoint, 'meters');
      totalDistance += segmentDistance;
    }

    return Math.round(totalDistance);
  }

  /**
   * Optimiza orden de waypoints para ruta más eficiente
   * @param {Object} origin - Punto de origen
   * @param {Object} destination - Punto de destino
   * @param {Array} waypoints - Puntos intermedios
   * @returns {Promise<Array>} - Waypoints optimizados
   */
  async optimizeWaypoints(origin, destination, waypoints) {
    try {
      if (waypoints.length <= 1) return waypoints;

      // Algoritmo simple: ordenar por distancia al origen
      const waypointsWithDistance = waypoints.map(waypoint => ({
        ...waypoint,
        distance: this.calculateDistance(origin, waypoint)
      }));

      waypointsWithDistance.sort((a, b) => a.distance - b.distance);
      
      return waypointsWithDistance.map(({ lat, lon }) => ({ lat, lon }));

    } catch (error) {
      logger.error('Error optimizando waypoints:', error.message);
      return waypoints; // retornar orden original si falla
    }
  }

  /**
   * Valida que una ruta es transitable
   * @param {Array} coordinates - Coordenadas de la ruta
   * @returns {Promise<Object>} - Resultado de validación
   */
  async validateRoute(coordinates) {
    try {
      const route = await this.routing(coordinates, { alternatives: false });
      
      return {
        isValid: true,
        distance: route.distance,
        duration: route.duration,
        coordinates: route.coordinates,
        message: 'Ruta válida y transitable'
      };

    } catch (error) {
      return {
        isValid: false,
        distance: 0,
        duration: 0,
        coordinates: [],
        message: `Ruta no válida: ${error.message}`
      };
    }
  }

  /**
   * Busca puntos de interés cerca de una ubicación
   * @param {Object} location - {lat, lon}
   * @param {string} amenity - Tipo de amenidad (ej: 'bus_station', 'school')
   * @param {number} radius - Radio en metros
   * @returns {Promise<Array>} - Puntos de interés encontrados
   */
  async findNearbyPOI(location, amenity, radius = 1000) {
    try {
      const params = {
        lat: location.lat,
        lon: location.lon,
        amenity: amenity,
        format: 'json',
        limit: 10,
        radius: radius / 1000 // convertir a km
      };

      const response = await this.httpClient.get(`${this.nominatimBaseUrl}/search`, {
        params
      });

      if (!response.data) return [];

      return response.data.map(poi => ({
        lat: parseFloat(poi.lat),
        lon: parseFloat(poi.lon),
        name: poi.display_name,
        type: poi.type,
        class: poi.class,
        distance: this.calculateDistance(location, {
          lat: parseFloat(poi.lat),
          lon: parseFloat(poi.lon)
        }, 'meters')
      }));

    } catch (error) {
      logger.error('Error buscando POI:', error.message);
      return [];
    }
  }

  /**
   * Calcula un score de confianza para un resultado de geocoding
   * @param {Object} result - Resultado de Nominatim
   * @param {string} originalQuery - Consulta original del usuario
   * @returns {number} - Score de confianza entre 0 y 1
   */
  calculateConfidence(result, originalQuery) {
    let confidence = 0.5; // Base score

    // Comparar con la consulta original
    const queryWords = originalQuery.toLowerCase().split(/\s+/);
    const displayName = result.display_name.toLowerCase();

    // Bonus por coincidencias exactas
    queryWords.forEach(word => {
      if (displayName.includes(word)) {
        confidence += 0.1;
      }
    });

    // Bonus por importancia de Nominatim
    if (result.importance) {
      confidence += result.importance * 0.3;
    }

    // Bonus por tipo de lugar
    const preferredTypes = ['administrative', 'amenity', 'building', 'highway'];
    if (preferredTypes.includes(result.class)) {
      confidence += 0.1;
    }

    // Penalty por lugares muy genéricos
    if (result.type === 'administrative' && result.class === 'boundary') {
      confidence -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Búsqueda avanzada con filtros específicos
   * @param {string} query - Consulta de búsqueda
   * @param {Object} filters - Filtros específicos
   * @returns {Promise<Array>} - Resultados filtrados
   */
  async advancedSearch(query, filters = {}) {
    try {
      const params = {
        q: query,
        format: 'json',
        limit: filters.limit || 20,
        addressdetails: 1,
        extratags: 1,
        ...filters
      };

      // Añadir filtros específicos si se proporcionan
      if (filters.country) params.countrycodes = filters.country;
      if (filters.bounded) params.bounded = 1;
      if (filters.polygon) params.polygon_geojson = 1;
      if (filters.viewbox) params.viewbox = filters.viewbox;

      logger.info(`Búsqueda avanzada: ${query}`, filters);
      
      const response = await this.httpClient.get(`${this.nominatimBaseUrl}/search`, {
        params
      });

      if (!response.data) return [];

      return response.data.map((result, index) => ({
        rank: index + 1,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        importance: result.importance || 0,
        type: result.type,
        class: result.class,
        address: result.address || {},
        place_id: result.place_id,
        confidence: this.calculateConfidence(result, query)
      }));

    } catch (error) {
      logger.error('Error en búsqueda avanzada:', error.message);
      throw new Error(`Error en búsqueda avanzada: ${error.message}`);
    }
  }
}

module.exports = OSMService;
