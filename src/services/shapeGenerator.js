const OSMService = require('./osmService');
const { PromptTemplate } = require('@langchain/core/prompts');
const logger = require('../config/logger');

class ShapeGenerator {
  constructor(llm) {
    this.llm = llm;
    this.osmService = new OSMService();
    this.setupPrompts();
  }

  setupPrompts() {
    // Prompt para análisis de rutas reales con OSM
    this.routeAnalysisPrompt = PromptTemplate.fromTemplate(`
Analiza esta ruta real obtenida de OpenStreetMap para optimizar el servicio de transporte:

Datos de la ruta:
- Distancia total: {distance} km
- Tiempo estimado: {duration} minutos
- Número de paradas: {stopsCount}
- Paradas: {stops}

Parámetros del servicio:
- Frecuencia deseada: {frequency} minutos
- Capacidad de vehículo: {capacity} pasajeros
- Horario de servicio: {startTime} - {endTime}
- Tipo de transporte: {transportType}

Calcula y responde en formato JSON con:
{{
  "optimalTrips": {{
    "totalTrips": number,
    "peakHourTrips": number,
    "offPeakTrips": number,
    "justification": "explicación del cálculo"
  }},
  "schedule": {{
    "peakHours": {{
      "start": "HH:MM",
      "end": "HH:MM",
      "frequency": number
    }},
    "offPeakHours": {{
      "start": "HH:MM", 
      "end": "HH:MM",
      "frequency": number
    }}
  }},
  "recommendations": [
    "recomendación 1",
    "recomendación 2"
  ]
}}

Considera:
- Tiempo de viaje real vs frecuencia deseada
- Capacidad vs demanda estimada
- Eficiencia operativa
- Experiencia del usuario
    `);

    // Prompt para optimización de paradas
    this.stopOptimizationPrompt = PromptTemplate.fromTemplate(`
Optimiza las paradas de esta ruta de transporte considerando datos reales de OpenStreetMap:

Ruta actual:
- Origen: {origin}
- Destino: {destination}
- Paradas intermedias: {intermediateStops}
- Distancia total: {totalDistance} km
- Tiempo total: {totalTime} minutos

Contexto urbano:
- Tipo de zona: {zoneType}
- Densidad poblacional: {populationDensity}
- Puntos de interés: {pointsOfInterest}

Responde en formato JSON con:
{{
  "optimizedStops": [
    {{
      "stop_id": "string",
      "stop_name": "string", 
      "stop_lat": number,
      "stop_lon": number,
      "stop_sequence": number,
      "justification": "por qué esta parada es importante"
    }}
  ],
  "routeSegments": [
    {{
      "from_stop": "string",
      "to_stop": "string",
      "distance_km": number,
      "estimated_time_min": number,
      "demand_level": "high|medium|low"
    }}
  ],
  "recommendations": [
    "recomendación de optimización"
  ]
}}

Considera:
- Distancia óptima entre paradas (300-800m en ciudad)
- Puntos de transferencia importantes
- Accesibilidad y conectividad
- Demanda real de pasajeros
    `);
  }

  /**
   * Genera shapes realistas combinando IA con datos OSM
   * @param {Object} routeRequest - Solicitud de ruta
   * @returns {Promise<Object>} - Datos completos de la ruta con shapes
   */
  async generateRealisticRoute(routeRequest) {
    try {
      logger.info('Iniciando generación de ruta realista con OSM');

      // 1. Geocoding de todas las ubicaciones
      const geocodedLocations = await this.geocodeLocations(routeRequest);
      
      // 2. Routing real entre paradas
      const routeData = await this.calculateRealRoute(geocodedLocations, routeRequest);
      
      // 3. Análisis con IA basado en datos reales
      const aiAnalysis = await this.analyzeRouteWithAI(routeData, routeRequest);
      
      // 4. Optimización de paradas con IA
      const optimizedStops = await this.optimizeStopsWithAI(routeData, routeRequest);
      
      // 5. Generar shapes GTFS
      const shapes = this.generateGTFSShapes(routeData.coordinates, routeRequest.shapeId);
      
      // 6. Compilar resultado final
      const result = {
        route: {
          route_id: routeRequest.route_id || `route_${Date.now()}`,
          route_short_name: routeRequest.route_short_name || 'R1',
          route_long_name: routeRequest.route_long_name || 'Ruta Realista',
          route_desc: routeRequest.route_desc || 'Ruta generada con datos reales de OSM',
          route_type: this.getRouteType(routeRequest.transportType),
          route_color: routeRequest.route_color || 'FF0000',
          route_text_color: routeRequest.route_text_color || 'FFFFFF'
        },
        stops: optimizedStops.optimizedStops,
        shapes: shapes,
        routeData: {
          distance: routeData.distance,
          duration: routeData.duration,
          coordinates: routeData.coordinates
        },
        aiAnalysis: aiAnalysis,
        metadata: {
          generatedAt: new Date(),
          osmDataUsed: true,
          aiOptimized: true,
          routeSegments: optimizedStops.routeSegments
        }
      };

      logger.info(`Ruta realista generada: ${result.route.route_id}`);
      return result;

    } catch (error) {
      logger.error('Error generando ruta realista:', error);
      throw error;
    }
  }

  /**
   * Geocodifica todas las ubicaciones de la ruta
   * @param {Object} routeRequest - Solicitud de ruta
   * @returns {Promise<Object>} - Ubicaciones geocodificadas
   */
  async geocodeLocations(routeRequest) {
    try {
      const locations = {};

      // Geocodificar origen
      if (routeRequest.origin) {
        locations.origin = await this.osmService.geocoding(routeRequest.origin);
      }

      // Geocodificar destino
      if (routeRequest.destination) {
        locations.destination = await this.osmService.geocoding(routeRequest.destination);
      }

      // Geocodificar paradas intermedias
      if (routeRequest.intermediateStops && routeRequest.intermediateStops.length > 0) {
        locations.intermediateStops = [];
        for (const stop of routeRequest.intermediateStops) {
          const geocodedStop = await this.osmService.geocoding(stop);
          locations.intermediateStops.push(geocodedStop);
        }
      }

      return locations;

    } catch (error) {
      logger.error('Error geocodificando ubicaciones:', error);
      throw error;
    }
  }

  /**
   * Calcula ruta real usando OSM
   * @param {Object} locations - Ubicaciones geocodificadas
   * @param {Object} routeRequest - Solicitud de ruta
   * @returns {Promise<Object>} - Datos de la ruta
   */
  async calculateRealRoute(locations, routeRequest) {
    try {
      const coordinates = [locations.origin];
      
      // Añadir paradas intermedias
      if (locations.intermediateStops) {
        coordinates.push(...locations.intermediateStops);
      }
      
      // Añadir destino
      coordinates.push(locations.destination);

      // Calcular ruta con OSRM
      const routeData = await this.osmService.routing(coordinates, {
        profile: this.getRoutingProfile(routeRequest.transportType),
        overview: 'full',
        geometries: 'polyline6'
      });

      return {
        ...routeData,
        locations: locations,
        waypoints: coordinates
      };

    } catch (error) {
      logger.error('Error calculando ruta real:', error);
      throw error;
    }
  }

  /**
   * Analiza ruta con IA basándose en datos reales
   * @param {Object} routeData - Datos de la ruta
   * @param {Object} routeRequest - Solicitud de ruta
   * @returns {Promise<Object>} - Análisis de IA
   */
  async analyzeRouteWithAI(routeData, routeRequest) {
    try {
      const distanceKm = (routeData.distance / 1000).toFixed(2);
      const durationMin = Math.round(routeData.duration / 60);
      const stopsCount = routeData.waypoints.length;

      const prompt = await this.routeAnalysisPrompt.format({
        distance: distanceKm,
        duration: durationMin,
        stopsCount: stopsCount,
        stops: JSON.stringify(routeData.waypoints.map(wp => wp.display_name || `${wp.lat}, ${wp.lon}`)),
        frequency: routeRequest.frequency || 30,
        capacity: routeRequest.capacity || 50,
        startTime: routeRequest.serviceHours?.start || '06:00',
        endTime: routeRequest.serviceHours?.end || '22:00',
        transportType: routeRequest.transportType || 'bus'
      });

      const response = await this.llm.invoke(prompt);
      const analysis = this.parseJSONResponse(response.content);

      return analysis;

    } catch (error) {
      logger.error('Error analizando ruta con IA:', error);
      return this.getFallbackAnalysis(routeData, routeRequest);
    }
  }

  /**
   * Optimiza paradas con IA
   * @param {Object} routeData - Datos de la ruta
   * @param {Object} routeRequest - Solicitud de ruta
   * @returns {Promise<Object>} - Paradas optimizadas
   */
  async optimizeStopsWithAI(routeData, routeRequest) {
    try {
      const totalDistance = (routeData.distance / 1000).toFixed(2);
      const totalTime = Math.round(routeData.duration / 60);

      const prompt = await this.stopOptimizationPrompt.format({
        origin: routeData.locations.origin.display_name,
        destination: routeData.locations.destination.display_name,
        intermediateStops: JSON.stringify(routeData.locations.intermediateStops?.map(s => s.display_name) || []),
        totalDistance: totalDistance,
        totalTime: totalTime,
        zoneType: routeRequest.zoneType || 'mixed',
        populationDensity: routeRequest.populationDensity || 'medium',
        pointsOfInterest: JSON.stringify(routeRequest.pointsOfInterest || [])
      });

      const response = await this.llm.invoke(prompt);
      const optimization = this.parseJSONResponse(response.content);

      return optimization;

    } catch (error) {
      logger.error('Error optimizando paradas con IA:', error);
      return this.getFallbackStops(routeData);
    }
  }

  /**
   * Genera shapes GTFS a partir de coordenadas
   * @param {Array} coordinates - Coordenadas de la ruta
   * @param {string} shapeId - ID del shape
   * @returns {Array} - Puntos shape para GTFS
   */
  generateGTFSShapes(coordinates, shapeId) {
    try {
      return this.osmService.generateShape(coordinates, shapeId);
    } catch (error) {
      logger.error('Error generando shapes GTFS:', error);
      return [];
    }
  }

  /**
   * Mejora una ruta existente con datos OSM
   * @param {Object} existingRoute - Ruta existente
   * @returns {Promise<Object>} - Ruta mejorada
   */
  async improveExistingRoute(existingRoute) {
    try {
      logger.info(`Mejorando ruta existente: ${existingRoute.route_id}`);

      // Convertir paradas existentes a coordenadas
      const coordinates = existingRoute.stops.map(stop => ({
        lat: stop.stop_lat,
        lon: stop.stop_lon
      }));

      // Calcular ruta real
      const routeData = await this.osmService.routing(coordinates, {
        profile: this.getRoutingProfile(existingRoute.route_type),
        overview: 'full'
      });

      // Generar shapes mejorados
      const improvedShapes = this.generateGTFSShapes(
        routeData.coordinates, 
        existingRoute.shape_id || `shape_${existingRoute.route_id}`
      );

      return {
        ...existingRoute,
        shapes: improvedShapes,
        routeData: {
          distance: routeData.distance,
          duration: routeData.duration,
          coordinates: routeData.coordinates
        },
        metadata: {
          ...existingRoute.metadata,
          improvedWithOSM: true,
          improvedAt: new Date()
        }
      };

    } catch (error) {
      logger.error('Error mejorando ruta existente:', error);
      throw error;
    }
  }

  /**
   * Valida que una ruta es transitable
   * @param {Object} route - Ruta a validar
   * @returns {Promise<Object>} - Resultado de validación
   */
  async validateRoute(route) {
    try {
      const coordinates = route.stops.map(stop => ({
        lat: stop.stop_lat,
        lon: stop.stop_lon
      }));

      return await this.osmService.validateRoute(coordinates);

    } catch (error) {
      logger.error('Error validando ruta:', error);
      return {
        isValid: false,
        message: `Error validando ruta: ${error.message}`
      };
    }
  }

  // Métodos auxiliares

  getRouteType(transportType) {
    const types = {
      'bus': 3,
      'subway': 1,
      'tram': 0,
      'ferry': 4,
      'cable_tram': 5,
      'aerial_lift': 6,
      'funicular': 7,
      'trolleybus': 11,
      'monorail': 12
    };
    return types[transportType] || 3;
  }

  getRoutingProfile(transportType) {
    const profiles = {
      'bus': 'driving',
      'subway': 'driving', // OSRM no tiene perfil específico para metro
      'tram': 'driving',
      'ferry': 'driving',
      'walking': 'foot'
    };
    return profiles[transportType] || 'driving';
  }

  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error parseando respuesta JSON:', error);
      return {};
    }
  }

  getFallbackAnalysis(routeData, routeRequest) {
    const distanceKm = routeData.distance / 1000;
    const durationMin = Math.round(routeData.duration / 60);
    
    return {
      optimalTrips: {
        totalTrips: Math.max(10, Math.round((16 * 60) / (routeRequest.frequency || 30))),
        peakHourTrips: Math.round(4 * 60 / 5), // 4 horas pico, cada 5 min
        offPeakTrips: Math.round(12 * 60 / (routeRequest.frequency || 30)),
        justification: 'Cálculo basado en distancia y tiempo real de la ruta'
      },
      schedule: {
        peakHours: {
          start: '07:00',
          end: '09:00',
          frequency: 5
        },
        offPeakHours: {
          start: '09:00',
          end: '22:00',
          frequency: routeRequest.frequency || 30
        }
      },
      recommendations: [
        `Ruta de ${distanceKm.toFixed(1)}km con tiempo de viaje de ${durationMin} minutos`,
        'Considerar ajustar frecuencia según demanda real'
      ]
    };
  }

  getFallbackStops(routeData) {
    const stops = routeData.waypoints.map((waypoint, index) => ({
      stop_id: `stop_${index + 1}`,
      stop_name: waypoint.display_name || `Parada ${index + 1}`,
      stop_lat: waypoint.lat,
      stop_lon: waypoint.lon,
      stop_sequence: index + 1,
      justification: 'Parada basada en datos reales de OSM'
    }));

    return {
      optimizedStops: stops,
      routeSegments: [],
      recommendations: ['Paradas generadas con datos reales de OpenStreetMap']
    };
  }
}

module.exports = ShapeGenerator;
