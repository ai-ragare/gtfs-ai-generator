const GTFSAgent = require('../generators/GTFSAgent');
const logger = require('../config/logger');

class OSMController {
  constructor() {
    this.gtfsAgent = new GTFSAgent();
  }

  /**
   * Genera una ruta realista usando OSM
   * POST /api/osm/generate-realistic-route
   */
  async generateRealisticRoute(req, res) {
    try {
      const {
        origin,
        destination,
        intermediateStops = [],
        frequency = 30,
        serviceHours = { start: '06:00', end: '22:00' },
        transportType = 'bus',
        route_short_name,
        route_long_name,
        route_desc,
        route_color = 'FF0000',
        route_text_color = 'FFFFFF',
        capacity = 50,
        zoneType = 'mixed',
        populationDensity = 'medium',
        pointsOfInterest = []
      } = req.body;

      // Validar parámetros requeridos
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren origen y destino'
        });
      }

      const routeRequest = {
        origin,
        destination,
        intermediateStops,
        frequency,
        serviceHours,
        transportType,
        route_short_name: route_short_name || `R${Date.now()}`,
        route_long_name: route_long_name || `${origin} → ${destination}`,
        route_desc: route_desc || `Ruta de ${transportType} entre ${origin} y ${destination}`,
        route_color,
        route_text_color,
        capacity,
        zoneType,
        populationDensity,
        pointsOfInterest,
        shapeId: `shape_${Date.now()}`
      };

      logger.info(`Generando ruta realista: ${origin} → ${destination}`);

      const realisticRoute = await this.gtfsAgent.generateRealisticRoute(routeRequest);

      res.json({
        success: true,
        data: realisticRoute,
        message: 'Ruta realista generada exitosamente'
      });

    } catch (error) {
      logger.error('Error generando ruta realista:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error generando ruta realista'
      });
    }
  }

  /**
   * Mejora una ruta existente con OSM
   * POST /api/osm/improve-route/:routeId
   */
  async improveRoute(req, res) {
    try {
      const { routeId } = req.params;
      const existingRoute = req.body;

      if (!existingRoute || !existingRoute.stops) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una ruta existente con paradas'
        });
      }

      logger.info(`Mejorando ruta existente: ${routeId}`);

      const improvedRoute = await this.gtfsAgent.improveRouteWithOSM(existingRoute);

      res.json({
        success: true,
        data: improvedRoute,
        message: 'Ruta mejorada exitosamente con datos OSM'
      });

    } catch (error) {
      logger.error('Error mejorando ruta:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error mejorando ruta con OSM'
      });
    }
  }

  /**
   * Valida una ruta usando OSM
   * POST /api/osm/validate-route
   */
  async validateRoute(req, res) {
    try {
      const route = req.body;

      if (!route || !route.stops) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una ruta con paradas para validar'
        });
      }

      logger.info(`Validando ruta: ${route.route_id || 'sin ID'}`);

      const validation = await this.gtfsAgent.validateRouteWithOSM(route);

      res.json({
        success: true,
        data: validation,
        message: validation.isValid ? 'Ruta válida' : 'Ruta no válida'
      });

    } catch (error) {
      logger.error('Error validando ruta:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error validando ruta con OSM'
      });
    }
  }

  /**
   * Genera ciudad completa con rutas realistas
   * POST /api/osm/generate-city-realistic
   */
  async generateCityRealistic(req, res) {
    try {
      const {
        cityName,
        citySize = 'medium',
        cityType = 'mixed',
        numberOfRoutes = 5,
        transportTypes = ['bus'],
        operatingHours = { start: '06:00', end: '22:00' },
        populationDensity = 'medium',
        language = 'es'
      } = req.body;

      if (!cityName) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere el nombre de la ciudad'
        });
      }

      const params = {
        cityName,
        citySize,
        cityType,
        numberOfRoutes,
        transportTypes,
        operatingHours,
        populationDensity,
        language
      };

      logger.info(`Generando ciudad con rutas realistas: ${cityName}`);

      const cityWithRealisticRoutes = await this.gtfsAgent.generateCityWithRealisticRoutes(params);

      res.json({
        success: true,
        data: cityWithRealisticRoutes,
        message: `Ciudad ${cityName} generada con rutas realistas exitosamente`
      });

    } catch (error) {
      logger.error('Error generando ciudad realista:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error generando ciudad con rutas realistas'
      });
    }
  }

  /**
   * Geocodifica una dirección
   * GET /api/osm/geocode
   */
  async geocode(req, res) {
    try {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una dirección para geocodificar'
        });
      }

      logger.info(`Geocodificando: ${address}`);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const coordinates = await osmService.geocoding(address);

      res.json({
        success: true,
        data: coordinates,
        message: 'Geocodificación exitosa'
      });

    } catch (error) {
      logger.error('Error geocodificando:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error geocodificando dirección'
      });
    }
  }

  /**
   * Geocodificación inversa
   * GET /api/osm/reverse-geocode
   */
  async reverseGeocode(req, res) {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren latitud y longitud'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          error: 'Latitud y longitud deben ser números válidos'
        });
      }

      logger.info(`Reverse geocoding: ${latitude}, ${longitude}`);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const address = await osmService.reverseGeocoding(latitude, longitude);

      res.json({
        success: true,
        data: address,
        message: 'Geocodificación inversa exitosa'
      });

    } catch (error) {
      logger.error('Error en reverse geocoding:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error en geocodificación inversa'
      });
    }
  }

  /**
   * Calcula ruta entre puntos
   * POST /api/osm/route
   */
  async calculateRoute(req, res) {
    try {
      const { coordinates, options = {} } = req.body;

      if (!coordinates || coordinates.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren al menos 2 coordenadas para calcular ruta'
        });
      }

      logger.info(`Calculando ruta con ${coordinates.length} puntos`);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const route = await osmService.routing(coordinates, options);

      res.json({
        success: true,
        data: route,
        message: 'Ruta calculada exitosamente'
      });

    } catch (error) {
      logger.error('Error calculando ruta:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error calculando ruta'
      });
    }
  }

  /**
   * Busca puntos de interés cerca de una ubicación
   * GET /api/osm/nearby-poi
   */
  async findNearbyPOI(req, res) {
    try {
      const { lat, lon, amenity = 'bus_station', radius = 1000 } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren latitud y longitud'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const radiusMeters = parseInt(radius);

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros numéricos inválidos'
        });
      }

      logger.info(`Buscando POI cerca de ${latitude}, ${longitude}`);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const pois = await osmService.findNearbyPOI(
        { lat: latitude, lon: longitude },
        amenity,
        radiusMeters
      );

      res.json({
        success: true,
        data: pois,
        message: `${pois.length} puntos de interés encontrados`
      });

    } catch (error) {
      logger.error('Error buscando POI:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error buscando puntos de interés'
      });
    }
  }

  /**
   * Geocoding con múltiples candidatos
   * GET /api/osm/geocode-candidates
   */
  async geocodeCandidates(req, res) {
    try {
      const { address, limit = 10 } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una dirección para geocodificar'
        });
      }

      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        return res.status(400).json({
          success: false,
          error: 'El límite debe ser un número entre 1 y 50'
        });
      }

      logger.info(`Geocoding candidatos: ${address} (límite: ${limitNum})`);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const candidates = await osmService.geocodingCandidates(address, { limit: limitNum });

      res.json({
        success: true,
        data: {
          query: address,
          candidates: candidates,
          total: candidates.length,
          best_match: candidates[0] || null
        },
        message: `${candidates.length} candidatos encontrados para "${address}"`
      });

    } catch (error) {
      logger.error('Error geocodificando candidatos:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error obteniendo candidatos de geocoding'
      });
    }
  }

  /**
   * Búsqueda avanzada con filtros
   * POST /api/osm/advanced-search
   */
  async advancedSearch(req, res) {
    try {
      const { query, filters = {} } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una consulta de búsqueda'
        });
      }

      logger.info(`Búsqueda avanzada: ${query}`, filters);

      const OSMService = require('../services/osmService');
      const osmService = new OSMService();
      const results = await osmService.advancedSearch(query, filters);

      res.json({
        success: true,
        data: {
          query: query,
          filters: filters,
          results: results,
          total: results.length
        },
        message: `${results.length} resultados encontrados`
      });

    } catch (error) {
      logger.error('Error en búsqueda avanzada:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error en búsqueda avanzada'
      });
    }
  }

  /**
   * Obtiene información de salud del servicio OSM
   * GET /api/osm/health
   */
  async healthCheck(req, res) {
    try {
      const OSMService = require('../services/osmService');
      const osmService = new OSMService();

      // Test básico de conectividad
      const testAddress = 'Madrid, España';
      const testCoordinates = await osmService.geocoding(testAddress);

      res.json({
        success: true,
        data: {
          status: 'healthy',
          services: {
            nominatim: 'operational',
            osrm: 'operational'
          },
          test: {
            address: testAddress,
            coordinates: testCoordinates
          },
          timestamp: new Date()
        },
        message: 'Servicios OSM operacionales'
      });

    } catch (error) {
      logger.error('Error en health check OSM:', error);
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          services: {
            nominatim: 'error',
            osrm: 'error'
          },
          error: error.message,
          timestamp: new Date()
        },
        message: 'Servicios OSM no disponibles'
      });
    }
  }
}

module.exports = OSMController;
