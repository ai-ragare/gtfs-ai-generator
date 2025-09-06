const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const CityPlanner = require('./CityPlanner');
const RouteGenerator = require('./RouteGenerator');
const ScheduleGenerator = require('./ScheduleGenerator');
const CoordinateGenerator = require('./CoordinateGenerator');
const DataExporter = require('./DataExporter');
const ShapeGenerator = require('../services/shapeGenerator');
const logger = require('../config/logger');

class GTFSAgent {
  constructor() {
    this.llm = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      temperature: 0.7,
    });
    
    this.cityPlanner = new CityPlanner(this.llm);
    this.routeGenerator = new RouteGenerator(this.llm);
    this.scheduleGenerator = new ScheduleGenerator(this.llm);
    this.coordinateGenerator = new CoordinateGenerator();
    this.dataExporter = new DataExporter();
    this.shapeGenerator = new ShapeGenerator(this.llm);
    
    this.setupPrompts();
  }

  setupPrompts() {
    this.systemPrompt = PromptTemplate.fromTemplate(`
Eres un experto en planificación urbana y sistemas de transporte público. 
Generas datos GTFS realistas y coherentes para ciudades ficticias.

Consideras:
- Patrones de movilidad urbana reales
- Densidad poblacional y puntos de interés
- Horarios y frecuencias lógicas según demanda
- Conexiones eficientes entre zonas
- Nomenclatura local y cultural apropiada
- Tiempos de viaje realistas entre paradas

Genera siempre datos que un planificador urbano consideraría lógicos y funcionales.

Contexto de la ciudad: {cityContext}
Tarea específica: {task}
    `);
  }

  async generateCity(params) {
    try {
      logger.info(`Iniciando generación de ciudad: ${params.cityName}`);
      
      // 1. Planificar la ciudad
      const cityLayout = await this.cityPlanner.planCity(params);
      logger.info('Layout de ciudad generado');
      
      // 2. Generar coordenadas geográficas
      const coordinates = await this.coordinateGenerator.generateCoordinates(
        cityLayout, 
        params.citySize
      );
      logger.info('Coordenadas geográficas generadas');
      
      // 3. Generar rutas lógicas
      const routes = await this.routeGenerator.generateRoutes(
        cityLayout, 
        coordinates, 
        params
      );
      logger.info(`${routes.length} rutas generadas`);
      
      // 4. Generar horarios coherentes
      const schedules = await this.scheduleGenerator.generateSchedules(
        routes, 
        params
      );
      logger.info('Horarios generados');
      
      // 5. Compilar datos GTFS
      const gtfsData = {
        city: {
          name: params.cityName,
          size: params.citySize,
          type: params.cityType || 'mixed',
          populationDensity: params.populationDensity,
          generatedAt: new Date(),
          parameters: params
        },
        agency: cityLayout.agency,
        routes,
        stops: coordinates.stops,
        trips: schedules.trips,
        stopTimes: schedules.stopTimes,
        calendar: schedules.calendar,
        shapes: coordinates.shapes
      };
      
      logger.info(`Ciudad ${params.cityName} generada exitosamente`);
      return gtfsData;
      
    } catch (error) {
      logger.error('Error generando ciudad:', error);
      throw error;
    }
  }

  async generateWithAI(prompt, context = {}) {
    try {
      const formattedPrompt = await this.systemPrompt.format({
        cityContext: JSON.stringify(context),
        task: prompt
      });
      
      const response = await this.llm.invoke(formattedPrompt);
      const parser = new StringOutputParser();
      const result = await parser.parse(response);
      
      return result;
    } catch (error) {
      logger.error('Error en generación con IA:', error);
      throw error;
    }
  }

  async validateGTFSData(gtfsData) {
    const validationErrors = [];
    
    // Validar agencia
    if (!gtfsData.agency || !gtfsData.agency.agency_name) {
      validationErrors.push('Agencia requerida');
    }
    
    // Validar rutas
    if (!gtfsData.routes || gtfsData.routes.length === 0) {
      validationErrors.push('Al menos una ruta requerida');
    }
    
    // Validar paradas
    if (!gtfsData.stops || gtfsData.stops.length === 0) {
      validationErrors.push('Al menos una parada requerida');
    }
    
    // Validar viajes
    if (!gtfsData.trips || gtfsData.trips.length === 0) {
      validationErrors.push('Al menos un viaje requerido');
    }
    
    // Validar horarios
    if (!gtfsData.stopTimes || gtfsData.stopTimes.length === 0) {
      validationErrors.push('Horarios de paradas requeridos');
    }
    
    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  }

  async exportToGTFS(gtfsData, format = 'csv') {
    try {
      const validation = await this.validateGTFSData(gtfsData);
      
      if (!validation.isValid) {
        throw new Error(`Datos GTFS inválidos: ${validation.errors.join(', ')}`);
      }
      
      return await this.dataExporter.exportToGTFS(gtfsData, format);
    } catch (error) {
      logger.error('Error exportando GTFS:', error);
      throw error;
    }
  }

  /**
   * Genera una ruta realista usando datos de OpenStreetMap
   * @param {Object} routeRequest - Solicitud de ruta con datos reales
   * @returns {Promise<Object>} - Ruta generada con shapes realistas
   */
  async generateRealisticRoute(routeRequest) {
    try {
      logger.info(`Generando ruta realista: ${routeRequest.origin} → ${routeRequest.destination}`);
      
      const realisticRoute = await this.shapeGenerator.generateRealisticRoute(routeRequest);
      
      logger.info(`Ruta realista generada: ${realisticRoute.route.route_id}`);
      return realisticRoute;
      
    } catch (error) {
      logger.error('Error generando ruta realista:', error);
      throw error;
    }
  }

  /**
   * Mejora una ruta existente con datos reales de OSM
   * @param {Object} existingRoute - Ruta existente a mejorar
   * @returns {Promise<Object>} - Ruta mejorada
   */
  async improveRouteWithOSM(existingRoute) {
    try {
      logger.info(`Mejorando ruta con OSM: ${existingRoute.route_id}`);
      
      const improvedRoute = await this.shapeGenerator.improveExistingRoute(existingRoute);
      
      logger.info(`Ruta mejorada: ${improvedRoute.route_id}`);
      return improvedRoute;
      
    } catch (error) {
      logger.error('Error mejorando ruta con OSM:', error);
      throw error;
    }
  }

  /**
   * Valida que una ruta es transitable usando OSM
   * @param {Object} route - Ruta a validar
   * @returns {Promise<Object>} - Resultado de validación
   */
  async validateRouteWithOSM(route) {
    try {
      logger.info(`Validando ruta con OSM: ${route.route_id}`);
      
      const validation = await this.shapeGenerator.validateRoute(route);
      
      logger.info(`Validación completada: ${validation.isValid ? 'Válida' : 'Inválida'}`);
      return validation;
      
    } catch (error) {
      logger.error('Error validando ruta con OSM:', error);
      throw error;
    }
  }

  /**
   * Genera ciudad completa con rutas realistas usando OSM
   * @param {Object} params - Parámetros de generación
   * @returns {Promise<Object>} - Ciudad generada con rutas realistas
   */
  async generateCityWithRealisticRoutes(params) {
    try {
      logger.info(`Generando ciudad con rutas realistas: ${params.cityName}`);
      
      // 1. Generar ciudad base (sin rutas)
      const baseCity = await this.generateCityBase(params);
      
      // 2. Generar rutas realistas para puntos clave
      const realisticRoutes = await this.generateRealisticRoutesForCity(baseCity, params);
      
      // 3. Compilar datos finales
      const cityWithRealisticRoutes = {
        ...baseCity,
        routes: realisticRoutes,
        metadata: {
          ...baseCity.metadata,
          realisticRoutes: true,
          osmIntegration: true,
          generatedAt: new Date()
        }
      };
      
      logger.info(`Ciudad con rutas realistas generada: ${params.cityName}`);
      return cityWithRealisticRoutes;
      
    } catch (error) {
      logger.error('Error generando ciudad con rutas realistas:', error);
      throw error;
    }
  }

  /**
   * Genera la base de la ciudad sin rutas
   * @param {Object} params - Parámetros de generación
   * @returns {Promise<Object>} - Ciudad base
   */
  async generateCityBase(params) {
    try {
      // Generar layout y coordenadas básicas
      const cityLayout = await this.cityPlanner.planCity(params);
      const coordinates = await this.coordinateGenerator.generateCoordinates(cityLayout, params.citySize);
      
      return {
        city: {
          name: params.cityName,
          size: params.citySize,
          type: params.cityType || 'mixed',
          populationDensity: params.populationDensity,
          generatedAt: new Date(),
          parameters: params
        },
        agency: cityLayout.agency,
        stops: coordinates.stops,
        shapes: coordinates.shapes
      };
      
    } catch (error) {
      logger.error('Error generando ciudad base:', error);
      throw error;
    }
  }

  /**
   * Genera rutas realistas para una ciudad
   * @param {Object} baseCity - Ciudad base
   * @param {Object} params - Parámetros
   * @returns {Promise<Array>} - Rutas realistas
   */
  async generateRealisticRoutesForCity(baseCity, params) {
    try {
      const routes = [];
      const numberOfRoutes = params.numberOfRoutes || 5;
      
      // Generar rutas principales entre puntos clave
      const keyStops = this.selectKeyStops(baseCity.stops, numberOfRoutes);
      
      for (let i = 0; i < numberOfRoutes; i++) {
        try {
          const routeRequest = {
            route_id: `route_${i + 1}`,
            route_short_name: `R${i + 1}`,
            route_long_name: `Ruta ${i + 1} - ${baseCity.city.name}`,
            route_desc: `Ruta de transporte público en ${baseCity.city.name}`,
            transportType: params.transportTypes?.[i % params.transportTypes.length] || 'bus',
            origin: keyStops[i]?.stop_name || `Punto ${i + 1}`,
            destination: keyStops[(i + 1) % keyStops.length]?.stop_name || `Punto ${(i + 1) % keyStops.length + 1}`,
            intermediateStops: this.selectIntermediateStops(baseCity.stops, i),
            frequency: this.getFrequencyForRouteType(params.transportTypes?.[i % params.transportTypes.length] || 'bus'),
            serviceHours: params.operatingHours || { start: '06:00', end: '22:00' },
            capacity: 50,
            shapeId: `shape_${i + 1}`
          };
          
          const realisticRoute = await this.shapeGenerator.generateRealisticRoute(routeRequest);
          routes.push(realisticRoute);
          
        } catch (error) {
          logger.warn(`Error generando ruta ${i + 1}, usando fallback:`, error.message);
          // Fallback a ruta sintética si falla la realista
          const fallbackRoute = await this.generateFallbackRoute(baseCity, i, params);
          routes.push(fallbackRoute);
        }
      }
      
      return routes;
      
    } catch (error) {
      logger.error('Error generando rutas realistas para ciudad:', error);
      throw error;
    }
  }

  /**
   * Selecciona paradas clave para rutas principales
   * @param {Array} stops - Todas las paradas
   * @param {number} count - Número de paradas a seleccionar
   * @returns {Array} - Paradas clave
   */
  selectKeyStops(stops, count) {
    if (!stops || stops.length === 0) return [];
    
    // Seleccionar paradas distribuidas geográficamente
    const step = Math.max(1, Math.floor(stops.length / count));
    return stops.filter((_, index) => index % step === 0).slice(0, count);
  }

  /**
   * Selecciona paradas intermedias para una ruta
   * @param {Array} stops - Todas las paradas
   * @param {number} routeIndex - Índice de la ruta
   * @returns {Array} - Paradas intermedias
   */
  selectIntermediateStops(stops, routeIndex) {
    if (!stops || stops.length <= 2) return [];
    
    // Seleccionar 1-3 paradas intermedias
    const intermediateCount = Math.min(3, Math.max(1, Math.floor(stops.length / 10)));
    const startIndex = (routeIndex * 2) % stops.length;
    
    return stops.slice(startIndex, startIndex + intermediateCount).map(stop => stop.stop_name);
  }

  /**
   * Obtiene frecuencia para tipo de ruta
   * @param {string} transportType - Tipo de transporte
   * @returns {number} - Frecuencia en minutos
   */
  getFrequencyForRouteType(transportType) {
    const frequencies = {
      'bus': 15,
      'subway': 5,
      'tram': 10,
      'ferry': 30
    };
    return frequencies[transportType] || 15;
  }

  /**
   * Genera ruta de fallback si falla la generación realista
   * @param {Object} baseCity - Ciudad base
   * @param {number} index - Índice de la ruta
   * @param {Object} params - Parámetros
   * @returns {Promise<Object>} - Ruta de fallback
   */
  async generateFallbackRoute(baseCity, index, params) {
    try {
      const transportType = params.transportTypes?.[index % params.transportTypes.length] || 'bus';
      
      return {
        route: {
          route_id: `route_${index + 1}`,
          route_short_name: `R${index + 1}`,
          route_long_name: `Ruta ${index + 1} - ${baseCity.city.name}`,
          route_desc: `Ruta de transporte público (fallback)`,
          route_type: this.shapeGenerator.getRouteType(transportType),
          route_color: this.generateRouteColor(index),
          route_text_color: 'FFFFFF'
        },
        stops: baseCity.stops.slice(index * 3, (index + 1) * 3),
        shapes: [],
        routeData: {
          distance: 5000, // 5km fallback
          duration: 1800, // 30 min fallback
          coordinates: []
        },
        aiAnalysis: {
          optimalTrips: { totalTrips: 20, justification: 'Fallback route' }
        },
        metadata: {
          fallback: true,
          generatedAt: new Date()
        }
      };
      
    } catch (error) {
      logger.error('Error generando ruta de fallback:', error);
      throw error;
    }
  }

  /**
   * Genera color para ruta
   * @param {number} index - Índice de la ruta
   * @returns {string} - Color hexadecimal
   */
  generateRouteColor(index) {
    const colors = [
      'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF',
      '00FFFF', 'FFA500', '800080', '008000', '000080'
    ];
    return colors[index % colors.length];
  }
}

module.exports = GTFSAgent;
