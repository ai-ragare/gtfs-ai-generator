const { PromptTemplate } = require('@langchain/core/prompts');
const logger = require('../config/logger');

class RouteGenerator {
  constructor(llm) {
    this.llm = llm;
    this.setupPrompts();
    this.routeTypes = {
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
  }

  setupPrompts() {
    this.routeGenerationPrompt = PromptTemplate.fromTemplate(`
Como experto en planificación de rutas de transporte público, genera rutas lógicas para la ciudad "{cityName}".

Layout de la ciudad:
{cityLayout}

Coordenadas disponibles:
{coordinates}

Parámetros:
- Número de rutas: {numberOfRoutes}
- Tipos de transporte: {transportTypes}
- Horarios de operación: {operatingHours}
- Idioma: {language}

Genera un JSON con las rutas que incluyan:
{{
  "routes": [
    {{
      "route_id": "route_1",
      "route_short_name": "L1",
      "route_long_name": "Línea 1 Norte-Sur",
      "route_desc": "Conecta el norte residencial con el centro comercial",
      "route_type": 1,
      "route_color": "FF0000",
      "route_text_color": "FFFFFF",
      "stops": ["stop_1", "stop_2", "stop_3"],
      "shape_id": "shape_1",
      "frequency_minutes": 5,
      "operating_hours": {{
        "start": "05:00",
        "end": "23:30"
      }},
      "peak_frequency_minutes": 3,
      "off_peak_frequency_minutes": 10
    }}
  ]
}}

Considera:
- Rutas que conecten zonas lógicamente
- Frecuencias apropiadas según tipo de ruta y zona
- Nombres de rutas coherentes con la cultura local
- Colores distintivos para cada ruta
- Paradas estratégicas en puntos de interés
- Horarios realistas según demanda
    `);
  }

  async generateRoutes(cityLayout, coordinates, params) {
    try {
      const prompt = await this.routeGenerationPrompt.format({
        cityName: params.cityName,
        cityLayout: JSON.stringify(cityLayout, null, 2),
        coordinates: JSON.stringify(coordinates, null, 2),
        numberOfRoutes: params.numberOfRoutes,
        transportTypes: JSON.stringify(params.transportTypes),
        operatingHours: JSON.stringify(params.operatingHours),
        language: params.language || 'es'
      });

      const response = await this.llm.invoke(prompt);
      const routes = this.parseRoutes(response.content, cityLayout, coordinates);
      
      logger.info(`${routes.length} rutas generadas para ${params.cityName}`);
      return routes;
      
    } catch (error) {
      logger.error('Error generando rutas:', error);
      return this.generateFallbackRoutes(cityLayout, coordinates, params);
    }
  }

  parseRoutes(response, cityLayout, coordinates) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      
      const routeData = JSON.parse(jsonMatch[0]);
      return this.processRoutes(routeData.routes, cityLayout, coordinates);
    } catch (error) {
      logger.error('Error parseando rutas:', error);
      return this.generateFallbackRoutes(cityLayout, coordinates, { numberOfRoutes: 5 });
    }
  }

  processRoutes(routes, cityLayout, coordinates) {
    return routes.map((route, index) => ({
      route_id: route.route_id || `route_${index + 1}`,
      agency_id: cityLayout.agency.agency_id || 'agency_1',
      route_short_name: route.route_short_name || `R${index + 1}`,
      route_long_name: route.route_long_name || `Ruta ${index + 1}`,
      route_desc: route.route_desc || `Ruta de transporte público`,
      route_type: this.getRouteType(route.route_type),
      route_url: route.route_url || '',
      route_color: route.route_color || this.generateRouteColor(index),
      route_text_color: route.route_text_color || 'FFFFFF',
      stops: route.stops || this.assignStopsToRoute(coordinates.stops, index),
      shape_id: route.shape_id || `shape_${index + 1}`,
      frequency_minutes: route.frequency_minutes || 10,
      operating_hours: route.operating_hours || { start: '05:00', end: '23:30' },
      peak_frequency_minutes: route.peak_frequency_minutes || 5,
      off_peak_frequency_minutes: route.off_peak_frequency_minutes || 15,
      ai_generated: true
    }));
  }

  generateFallbackRoutes(cityLayout, coordinates, params) {
    const routes = [];
    const numberOfRoutes = params.numberOfRoutes || 5;
    
    for (let i = 0; i < numberOfRoutes; i++) {
      const routeType = this.getRandomRouteType(params.transportTypes);
      const route = {
        route_id: `route_${i + 1}`,
        agency_id: cityLayout.agency.agency_id || 'agency_1',
        route_short_name: this.generateRouteShortName(i, routeType),
        route_long_name: this.generateRouteLongName(i, routeType),
        route_desc: `Ruta de transporte público generada automáticamente`,
        route_type: routeType,
        route_color: this.generateRouteColor(i),
        route_text_color: 'FFFFFF',
        stops: this.assignStopsToRoute(coordinates.stops, i),
        shape_id: `shape_${i + 1}`,
        frequency_minutes: this.getFrequencyForRouteType(routeType),
        operating_hours: params.operatingHours || { start: '05:00', end: '23:30' },
        peak_frequency_minutes: this.getPeakFrequency(routeType),
        off_peak_frequency_minutes: this.getOffPeakFrequency(routeType),
        ai_generated: true
      };
      
      routes.push(route);
    }
    
    return routes;
  }

  getRouteType(routeType) {
    if (typeof routeType === 'number') {
      return routeType;
    }
    
    if (typeof routeType === 'string') {
      return this.routeTypes[routeType] || 3; // Default to bus
    }
    
    return 3; // Default to bus
  }

  getRandomRouteType(transportTypes) {
    if (!transportTypes || transportTypes.length === 0) {
      return 3; // Default to bus
    }
    
    const randomType = transportTypes[Math.floor(Math.random() * transportTypes.length)];
    return this.routeTypes[randomType] || 3;
  }

  generateRouteShortName(index, routeType) {
    const typePrefix = {
      1: 'L', // subway
      3: 'R', // bus
      0: 'T'  // tram
    };
    
    const prefix = typePrefix[routeType] || 'R';
    return `${prefix}${index + 1}`;
  }

  generateRouteLongName(index, routeType) {
    const typeNames = {
      1: 'Línea',
      3: 'Ruta',
      0: 'Tranvía'
    };
    
    const typeName = typeNames[routeType] || 'Ruta';
    const directions = ['Norte-Sur', 'Este-Oeste', 'Circular', 'Centro', 'Periférico'];
    const direction = directions[index % directions.length];
    
    return `${typeName} ${index + 1} - ${direction}`;
  }

  generateRouteColor(index) {
    const colors = [
      'FF0000', // Red
      '00FF00', // Green
      '0000FF', // Blue
      'FFFF00', // Yellow
      'FF00FF', // Magenta
      '00FFFF', // Cyan
      'FFA500', // Orange
      '800080', // Purple
      '008000', // Dark Green
      '000080'  // Navy
    ];
    
    return colors[index % colors.length];
  }

  assignStopsToRoute(stops, routeIndex) {
    if (!stops || stops.length === 0) {
      return [];
    }
    
    // Asignar paradas de manera lógica
    const stopsPerRoute = Math.max(3, Math.floor(stops.length / 5));
    const startIndex = routeIndex * stopsPerRoute;
    const endIndex = Math.min(startIndex + stopsPerRoute, stops.length);
    
    return stops.slice(startIndex, endIndex).map(stop => stop.stop_id);
  }

  getFrequencyForRouteType(routeType) {
    const frequencies = {
      1: 5,  // subway - high frequency
      3: 10, // bus - medium frequency
      0: 8   // tram - medium-high frequency
    };
    
    return frequencies[routeType] || 10;
  }

  getPeakFrequency(routeType) {
    const peakFrequencies = {
      1: 3,  // subway
      3: 5,  // bus
      0: 4   // tram
    };
    
    return peakFrequencies[routeType] || 5;
  }

  getOffPeakFrequency(routeType) {
    const offPeakFrequencies = {
      1: 8,  // subway
      3: 15, // bus
      0: 12  // tram
    };
    
    return offPeakFrequencies[routeType] || 15;
  }
}

module.exports = RouteGenerator;
