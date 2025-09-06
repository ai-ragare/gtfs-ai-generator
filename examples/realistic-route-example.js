#!/usr/bin/env node

/**
 * Ejemplo práctico de generación de ruta realista con OSM
 * 
 * Este ejemplo demuestra cómo usar la integración OSM para generar
 * una ruta de autobús realista entre dos ciudades españolas.
 * 
 * Ejecutar con: node examples/realistic-route-example.js
 */

require('dotenv').config();
const GTFSAgent = require('../src/generators/GTFSAgent');
const logger = require('../src/config/logger');

async function generateRealisticRouteExample() {
  console.log('🚌 Ejemplo: Generación de Ruta Realista con OSM\n');
  
  try {
    // Inicializar el agente GTFS
    const gtfsAgent = new GTFSAgent();
    
    // Definir solicitud de ruta realista
    const routeRequest = {
      origin: "Valencia, Estación del Norte",
      destination: "Gandía, Estación de Tren",
      intermediateStops: [
        "Alzira, Centro",
        "Sueca, Ayuntamiento"
      ],
      frequency: 30, // cada 30 minutos
      serviceHours: {
        start: "06:00",
        end: "22:00"
      },
      transportType: "bus",
      route_short_name: "L1",
      route_long_name: "Valencia - Gandía",
      route_desc: "Línea de autobús interurbano Valencia-Gandía",
      route_color: "0066CC",
      route_text_color: "FFFFFF",
      capacity: 50,
      zoneType: "mixed",
      populationDensity: "medium",
      pointsOfInterest: [
        "Universidad de Valencia",
        "Hospital General",
        "Centro Comercial"
      ]
    };
    
    console.log('📍 Ruta solicitada:');
    console.log(`   Origen: ${routeRequest.origin}`);
    console.log(`   Destino: ${routeRequest.destination}`);
    console.log(`   Paradas intermedias: ${routeRequest.intermediateStops.join(', ')}`);
    console.log(`   Frecuencia: ${routeRequest.frequency} minutos`);
    console.log(`   Horario: ${routeRequest.serviceHours.start} - ${routeRequest.serviceHours.end}\n`);
    
    console.log('🔄 Generando ruta realista con OSM...\n');
    
    // Generar ruta realista
    const realisticRoute = await gtfsAgent.generateRealisticRoute(routeRequest);
    
    // Mostrar resultados
    console.log('✅ Ruta generada exitosamente!\n');
    
    console.log('📋 INFORMACIÓN DE LA RUTA:');
    console.log('='.repeat(50));
    console.log(`ID: ${realisticRoute.route.route_id}`);
    console.log(`Nombre corto: ${realisticRoute.route.route_short_name}`);
    console.log(`Nombre largo: ${realisticRoute.route.route_long_name}`);
    console.log(`Descripción: ${realisticRoute.route.route_desc}`);
    console.log(`Tipo: ${realisticRoute.route.route_type} (autobús)`);
    console.log(`Color: #${realisticRoute.route.route_color}`);
    
    console.log('\n📊 DATOS DE LA RUTA REAL:');
    console.log('='.repeat(50));
    console.log(`Distancia total: ${(realisticRoute.routeData.distance / 1000).toFixed(1)} km`);
    console.log(`Tiempo estimado: ${Math.round(realisticRoute.routeData.duration / 60)} minutos`);
    console.log(`Puntos de shape: ${realisticRoute.shapes.length}`);
    
    console.log('\n🚏 PARADAS DE LA RUTA:');
    console.log('='.repeat(50));
    realisticRoute.stops.forEach((stop, index) => {
      console.log(`${index + 1}. ${stop.stop_name}`);
      console.log(`   Coordenadas: ${stop.stop_lat}, ${stop.stop_lon}`);
      console.log(`   Secuencia: ${stop.stop_sequence}`);
      if (stop.justification) {
        console.log(`   Justificación: ${stop.justification}`);
      }
      console.log('');
    });
    
    console.log('🤖 ANÁLISIS DE IA:');
    console.log('='.repeat(50));
    if (realisticRoute.aiAnalysis && realisticRoute.aiAnalysis.optimalTrips) {
      const analysis = realisticRoute.aiAnalysis.optimalTrips;
      console.log(`Total de viajes: ${analysis.totalTrips}`);
      console.log(`Viajes hora pico: ${analysis.peakHourTrips}`);
      console.log(`Viajes fuera de pico: ${analysis.offPeakTrips}`);
      console.log(`Justificación: ${analysis.justification}`);
    }
    
    if (realisticRoute.aiAnalysis && realisticRoute.aiAnalysis.recommendations) {
      console.log('\n💡 RECOMENDACIONES:');
      realisticRoute.aiAnalysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n📐 SHAPES GTFS (primeros 5 puntos):');
    console.log('='.repeat(50));
    realisticRoute.shapes.slice(0, 5).forEach((shape, index) => {
      console.log(`${index + 1}. Lat: ${shape.shape_pt_lat}, Lon: ${shape.shape_pt_lon}, Dist: ${shape.shape_dist_traveled}m`);
    });
    
    if (realisticRoute.shapes.length > 5) {
      console.log(`... y ${realisticRoute.shapes.length - 5} puntos más`);
    }
    
    console.log('\n🎯 METADATOS:');
    console.log('='.repeat(50));
    console.log(`Generado con OSM: ${realisticRoute.metadata.osmDataUsed ? 'Sí' : 'No'}`);
    console.log(`Optimizado con IA: ${realisticRoute.metadata.aiOptimized ? 'Sí' : 'No'}`);
    console.log(`Fecha de generación: ${realisticRoute.metadata.generatedAt}`);
    
    console.log('\n✨ ¡Ruta realista generada exitosamente!');
    console.log('\n💡 Esta ruta:');
    console.log('   - Sigue calles reales de OpenStreetMap');
    console.log('   - Tiene paradas optimizadas por IA');
    console.log('   - Incluye shapes GTFS compatibles');
    console.log('   - Considera distancias y tiempos reales');
    console.log('   - Está lista para exportar a GTFS');
    
  } catch (error) {
    console.error('❌ Error generando ruta realista:', error.message);
    
    if (error.message.includes('geocoding')) {
      console.log('\n💡 Sugerencias:');
      console.log('   - Verifica que las direcciones sean correctas');
      console.log('   - Usa nombres de ciudades más generales');
      console.log('   - Asegúrate de tener conexión a internet');
    }
  }
}

async function generateCityExample() {
  console.log('\n🏙️ Ejemplo: Ciudad Completa con Rutas Realistas\n');
  
  try {
    const gtfsAgent = new GTFSAgent();
    
    const cityRequest = {
      cityName: "Valencia",
      citySize: "large",
      cityType: "mixed",
      numberOfRoutes: 3,
      transportTypes: ["bus", "tram"],
      operatingHours: {
        start: "06:00",
        end: "22:00"
      },
      populationDensity: "high",
      language: "es"
    };
    
    console.log('🏙️ Generando ciudad con rutas realistas...');
    console.log(`Ciudad: ${cityRequest.cityName}`);
    console.log(`Rutas: ${cityRequest.numberOfRoutes}`);
    console.log(`Tipos: ${cityRequest.transportTypes.join(', ')}\n`);
    
    const city = await gtfsAgent.generateCityWithRealisticRoutes(cityRequest);
    
    console.log('✅ Ciudad generada exitosamente!\n');
    
    console.log('🏙️ INFORMACIÓN DE LA CIUDAD:');
    console.log('='.repeat(50));
    console.log(`Nombre: ${city.city.name}`);
    console.log(`Tamaño: ${city.city.size}`);
    console.log(`Tipo: ${city.city.type}`);
    console.log(`Densidad: ${city.city.populationDensity}`);
    
    console.log('\n🚌 RUTAS GENERADAS:');
    console.log('='.repeat(50));
    city.routes.forEach((route, index) => {
      console.log(`${index + 1}. ${route.route.route_short_name} - ${route.route.route_long_name}`);
      console.log(`   Tipo: ${route.route.route_type} (${route.route.route_type === 3 ? 'autobús' : 'tranvía'})`);
      console.log(`   Paradas: ${route.stops.length}`);
      console.log(`   Shapes: ${route.shapes.length} puntos`);
      if (route.routeData) {
        console.log(`   Distancia: ${(route.routeData.distance / 1000).toFixed(1)} km`);
        console.log(`   Tiempo: ${Math.round(route.routeData.duration / 60)} min`);
      }
      console.log('');
    });
    
    console.log('🎯 METADATOS DE LA CIUDAD:');
    console.log('='.repeat(50));
    console.log(`Rutas realistas: ${city.metadata.realisticRoutes ? 'Sí' : 'No'}`);
    console.log(`Integración OSM: ${city.metadata.osmIntegration ? 'Sí' : 'No'}`);
    console.log(`Fecha: ${city.metadata.generatedAt}`);
    
  } catch (error) {
    console.error('❌ Error generando ciudad:', error.message);
  }
}

// Ejecutar ejemplos
async function runExamples() {
  console.log('🚀 GTFS AI Generator - Ejemplos de Integración OSM');
  console.log('='.repeat(60));
  
  // Ejemplo 1: Ruta individual
  await generateRealisticRouteExample();
  
  // Ejemplo 2: Ciudad completa
  await generateCityExample();
  
  console.log('\n🎉 ¡Ejemplos completados!');
  console.log('\n📚 Para más información:');
  console.log('   - Documentación: docs/OSM_INTEGRATION.md');
  console.log('   - Tests: node scripts/test-osm-integration.js');
  console.log('   - API: http://localhost:3000/api/osm/health');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = { generateRealisticRouteExample, generateCityExample };
