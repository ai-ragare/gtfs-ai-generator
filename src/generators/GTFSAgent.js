const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const CityPlanner = require('./CityPlanner');
const RouteGenerator = require('./RouteGenerator');
const ScheduleGenerator = require('./ScheduleGenerator');
const CoordinateGenerator = require('./CoordinateGenerator');
const DataExporter = require('./DataExporter');
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
}

module.exports = GTFSAgent;
