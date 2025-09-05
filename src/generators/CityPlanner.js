const { PromptTemplate } = require('@langchain/core/prompts');
const logger = require('../config/logger');

class CityPlanner {
  constructor(llm) {
    this.llm = llm;
    this.setupPrompts();
  }

  setupPrompts() {
    this.cityLayoutPrompt = PromptTemplate.fromTemplate(`
Como experto en planificación urbana, diseña el layout de la ciudad "{cityName}" con las siguientes características:

Parámetros de la ciudad:
- Tamaño: {citySize}
- Tipo: {cityType}
- Densidad poblacional: {populationDensity}
- Áreas turísticas: {touristAreas}
- Zonas industriales: {industrialZones}
- Número de rutas: {numberOfRoutes}
- Tipos de transporte: {transportTypes}
- Idioma: {language}
- País: {country}
- Zona Horaria: {timezone}

Genera un JSON con la siguiente estructura:
{{
  "agency": {{
    "agency_name": "Nombre de la empresa de transporte",
    "agency_url": "https://ejemplo.com",
    "agency_timezone": "{timezone}",
    "agency_lang": "{language}",
    "agency_phone": "Un número de teléfono de contacto",
    "description": "Descripción de la empresa"
  }},
  "zones": [
    {{
      "zone_id": "zone_1",
      "zone_name": "Centro Histórico",
      "zone_type": "commercial",
      "description": "Zona comercial y turística",
      "importance": "high"
    }}
  ],
  "points_of_interest": [
    {{
      "poi_id": "poi_1",
      "poi_name": "Estación Central",
      "poi_type": "transport_hub",
      "zone_id": "zone_1",
      "description": "Estación principal de transporte"
    }}
  ],
  "route_planning": {{
    "primary_routes": [
      {{
        "route_name": "Línea Principal Norte-Sur",
        "route_type": "subway",
        "description": "Conecta el norte y sur de la ciudad",
        "priority": "high"
      }}
    ],
    "secondary_routes": [],
    "feeder_routes": []
  }}
}}

Considera:
- Distribución lógica de zonas según el tipo de ciudad
- Puntos de interés relevantes para el transporte público
- Jerarquía de rutas (principales, secundarias, alimentadoras)
- Conexiones lógicas entre zonas
- Nomenclatura local apropiada para el país {country}
    `);
  }

  async planCity(params) {
    try {
      const prompt = await this.cityLayoutPrompt.format({
        cityName: params.cityName,
        citySize: params.citySize,
        cityType: params.cityType || 'mixed',
        populationDensity: params.populationDensity,
        touristAreas: params.touristAreas,
        industrialZones: params.industrialZones,
        numberOfRoutes: params.numberOfRoutes,
        transportTypes: JSON.stringify(params.transportTypes),
        language: params.language || 'es',
        country: params.country || 'México',
        timezone: params.timezone || 'America/Mexico_City'
      });

      const response = await this.llm.invoke(prompt);
      const cityLayout = this.parseCityLayout(response.content);
      
      logger.info(`Layout de ciudad generado para ${params.cityName}`);
      return cityLayout;
      
    } catch (error) {
      logger.error('Error planificando ciudad:', error);
      throw error;
    }
  }

  parseCityLayout(response) {
    try {
      // Extraer JSON del response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      
      const cityLayout = JSON.parse(jsonMatch[0]);
      
      // Validar estructura básica
      if (!cityLayout.agency || !cityLayout.zones) {
        throw new Error('Estructura de ciudad inválida');
      }
      
      return cityLayout;
    } catch (error) {
      logger.error('Error parseando layout de ciudad:', error);
      // Fallback a estructura básica
      return this.getDefaultCityLayout();
    }
  }

  getDefaultCityLayout() {
    return {
      agency: {
        agency_name: "Transporte Municipal",
        agency_url: "https://transporte-municipal.com",
        agency_timezone: "America/Mexico_City",
        agency_lang: "es",
        agency_phone: "+52-55-1234-5678",
        description: "Sistema de transporte público municipal"
      },
      zones: [
        {
          zone_id: "zone_1",
          zone_name: "Centro",
          zone_type: "commercial",
          description: "Zona comercial y administrativa",
          importance: "high"
        },
        {
          zone_id: "zone_2",
          zone_name: "Residencial Norte",
          zone_type: "residential",
          description: "Zona residencial",
          importance: "medium"
        },
        {
          zone_id: "zone_3",
          zone_name: "Industrial Sur",
          zone_type: "industrial",
          description: "Zona industrial",
          importance: "medium"
        }
      ],
      points_of_interest: [
        {
          poi_id: "poi_1",
          poi_name: "Estación Central",
          poi_type: "transport_hub",
          zone_id: "zone_1",
          description: "Estación principal de transporte"
        },
        {
          poi_id: "poi_2",
          poi_name: "Centro Comercial",
          poi_type: "commercial",
          zone_id: "zone_1",
          description: "Centro comercial principal"
        },
        {
          poi_id: "poi_3",
          poi_name: "Universidad",
          poi_type: "educational",
          zone_id: "zone_2",
          description: "Universidad principal"
        }
      ],
      route_planning: {
        primary_routes: [
          {
            route_name: "Línea Principal Norte-Sur",
            route_type: "subway",
            description: "Conecta el norte y sur de la ciudad",
            priority: "high"
          }
        ],
        secondary_routes: [
          {
            route_name: "Ruta Circular Centro",
            route_type: "bus",
            description: "Ruta circular del centro",
            priority: "medium"
          }
        ],
        feeder_routes: []
      }
    };
  }

  generateZoneConnections(zones) {
    const connections = [];
    
    // Conectar zonas adyacentes lógicamente
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const zone1 = zones[i];
        const zone2 = zones[j];
        
        // Lógica de conexión basada en tipos de zona
        if (this.shouldConnectZones(zone1, zone2)) {
          connections.push({
            from_zone: zone1.zone_id,
            to_zone: zone2.zone_id,
            connection_type: this.getConnectionType(zone1, zone2),
            distance_km: this.estimateDistance(zone1, zone2)
          });
        }
      }
    }
    
    return connections;
  }

  shouldConnectZones(zone1, zone2) {
    // Zonas comerciales se conectan con todo
    if (zone1.zone_type === 'commercial' || zone2.zone_type === 'commercial') {
      return true;
    }
    
    // Zonas residenciales se conectan con comerciales e industriales
    if ((zone1.zone_type === 'residential' && zone2.zone_type === 'industrial') ||
        (zone1.zone_type === 'industrial' && zone2.zone_type === 'residential')) {
      return true;
    }
    
    return false;
  }

  getConnectionType(zone1, zone2) {
    if (zone1.importance === 'high' || zone2.importance === 'high') {
      return 'primary';
    }
    return 'secondary';
  }

  estimateDistance(zone1, zone2) {
    // Estimación simple de distancia basada en importancia
    const baseDistance = 5; // km base
    const importanceMultiplier = zone1.importance === 'high' || zone2.importance === 'high' ? 1.5 : 1;
    return baseDistance * importanceMultiplier;
  }
}

module.exports = CityPlanner;
