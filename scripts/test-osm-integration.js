#!/usr/bin/env node

/**
 * Script de testing para validar la integración con OpenStreetMap
 * Ejecutar con: node scripts/test-osm-integration.js
 */

require('dotenv').config();
const OSMService = require('../src/services/osmService');
const ShapeGenerator = require('../src/services/shapeGenerator');
const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const logger = require('../src/config/logger');

class OSMIntegrationTester {
  constructor() {
    this.osmService = new OSMService();
    this.llm = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      temperature: 0.7,
    });
    this.shapeGenerator = new ShapeGenerator(this.llm);
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Iniciando tests de integración OSM...\n');

    try {
      // Test 1: Conectividad básica
      await this.testBasicConnectivity();
      
      // Test 2: Geocoding
      await this.testGeocoding();
      
      // Test 3: Reverse Geocoding
      await this.testReverseGeocoding();
      
      // Test 4: Routing
      await this.testRouting();
      
      // Test 5: Shape Generation
      await this.testShapeGeneration();
      
      // Test 6: Ruta realista completa
      await this.testRealisticRouteGeneration();
      
      // Mostrar resultados
      this.showResults();
      
    } catch (error) {
      console.error('❌ Error ejecutando tests:', error);
      process.exit(1);
    }
  }

  async testBasicConnectivity() {
    console.log('🔍 Test 1: Conectividad básica con APIs OSM...');
    
    try {
      // Test Nominatim
      const testAddress = 'Madrid, España';
      const coordinates = await this.osmService.geocoding(testAddress);
      
      if (coordinates.lat && coordinates.lon) {
        this.addTestResult('Conectividad Nominatim', true, `Geocoding exitoso: ${coordinates.lat}, ${coordinates.lon}`);
      } else {
        this.addTestResult('Conectividad Nominatim', false, 'No se obtuvieron coordenadas válidas');
      }
      
      // Test OSRM
      const route = await this.osmService.routing([
        { lat: 40.4168, lon: -3.7038 }, // Madrid
        { lat: 40.4200, lon: -3.7100 }  // Madrid (cerca)
      ]);
      
      if (route.distance && route.duration) {
        this.addTestResult('Conectividad OSRM', true, `Routing exitoso: ${route.distance}m, ${route.duration}s`);
      } else {
        this.addTestResult('Conectividad OSRM', false, 'No se obtuvo ruta válida');
      }
      
    } catch (error) {
      this.addTestResult('Conectividad básica', false, error.message);
    }
  }

  async testGeocoding() {
    console.log('🔍 Test 2: Geocoding de direcciones...');
    
    const testAddresses = [
      'Valencia, España',
      'Barcelona, España',
      'Sevilla, España'
    ];
    
    for (const address of testAddresses) {
      try {
        const coordinates = await this.osmService.geocoding(address);
        
        if (coordinates.lat && coordinates.lon && coordinates.display_name) {
          this.addTestResult(`Geocoding: ${address}`, true, 
            `${coordinates.lat}, ${coordinates.lon} - ${coordinates.display_name}`);
        } else {
          this.addTestResult(`Geocoding: ${address}`, false, 'Datos incompletos');
        }
        
      } catch (error) {
        this.addTestResult(`Geocoding: ${address}`, false, error.message);
      }
    }
  }

  async testReverseGeocoding() {
    console.log('🔍 Test 3: Reverse Geocoding...');
    
    const testCoordinates = [
      { lat: 40.4168, lon: -3.7038, name: 'Madrid' },
      { lat: 39.4699, lon: -0.3763, name: 'Valencia' },
      { lat: 41.3851, lon: 2.1734, name: 'Barcelona' }
    ];
    
    for (const coord of testCoordinates) {
      try {
        const address = await this.osmService.reverseGeocoding(coord.lat, coord.lon);
        
        if (address.display_name) {
          this.addTestResult(`Reverse Geocoding: ${coord.name}`, true, address.display_name);
        } else {
          this.addTestResult(`Reverse Geocoding: ${coord.name}`, false, 'No se obtuvo dirección');
        }
        
      } catch (error) {
        this.addTestResult(`Reverse Geocoding: ${coord.name}`, false, error.message);
      }
    }
  }

  async testRouting() {
    console.log('🔍 Test 4: Routing entre ciudades...');
    
    try {
      // Ruta Madrid - Valencia
      const route = await this.osmService.routing([
        { lat: 40.4168, lon: -3.7038 }, // Madrid
        { lat: 39.4699, lon: -0.3763 }  // Valencia
      ]);
      
      if (route.distance && route.duration && route.coordinates.length > 0) {
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        
        this.addTestResult('Routing Madrid-Valencia', true, 
          `${distanceKm}km, ${durationMin}min, ${route.coordinates.length} puntos`);
      } else {
        this.addTestResult('Routing Madrid-Valencia', false, 'Datos de ruta incompletos');
      }
      
    } catch (error) {
      this.addTestResult('Routing Madrid-Valencia', false, error.message);
    }
  }

  async testShapeGeneration() {
    console.log('🔍 Test 5: Generación de shapes GTFS...');
    
    try {
      const coordinates = [
        { lat: 40.4168, lon: -3.7038 },
        { lat: 40.4200, lon: -3.7100 },
        { lat: 40.4250, lon: -3.7150 }
      ];
      
      const shapes = this.osmService.generateShape(coordinates, 'test_shape');
      
      if (shapes.length > 0 && shapes[0].shape_id === 'test_shape') {
        this.addTestResult('Generación de shapes', true, 
          `${shapes.length} puntos generados correctamente`);
      } else {
        this.addTestResult('Generación de shapes', false, 'Shapes no generados correctamente');
      }
      
    } catch (error) {
      this.addTestResult('Generación de shapes', false, error.message);
    }
  }

  async testRealisticRouteGeneration() {
    console.log('🔍 Test 6: Generación de ruta realista completa...');
    
    try {
      const routeRequest = {
        origin: 'Valencia, Estación Central',
        destination: 'Cullera, Plaza Mayor',
        intermediateStops: ['Alzira Centro', 'Sueca Ayuntamiento'],
        frequency: 30,
        serviceHours: { start: '06:00', end: '22:00' },
        transportType: 'bus',
        route_short_name: 'R1',
        route_long_name: 'Valencia - Cullera',
        route_desc: 'Ruta de prueba con OSM',
        capacity: 50,
        shapeId: 'test_shape_realistic'
      };
      
      const realisticRoute = await this.shapeGenerator.generateRealisticRoute(routeRequest);
      
      if (realisticRoute.route && realisticRoute.stops && realisticRoute.shapes) {
        this.addTestResult('Ruta realista completa', true, 
          `Ruta ${realisticRoute.route.route_id} con ${realisticRoute.stops.length} paradas y ${realisticRoute.shapes.length} puntos shape`);
      } else {
        this.addTestResult('Ruta realista completa', false, 'Datos de ruta incompletos');
      }
      
    } catch (error) {
      this.addTestResult('Ruta realista completa', false, error.message);
    }
  }

  addTestResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message,
      timestamp: new Date()
    });
    
    const status = success ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  showResults() {
    console.log('\n📊 RESUMEN DE TESTS:');
    console.log('='.repeat(50));
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const successRate = ((successful / total) * 100).toFixed(1);
    
    console.log(`Tests exitosos: ${successful}/${total} (${successRate}%)`);
    console.log('');
    
    // Mostrar tests fallidos
    const failed = this.testResults.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('❌ TESTS FALLIDOS:');
      failed.forEach(test => {
        console.log(`  - ${test.test}: ${test.message}`);
      });
      console.log('');
    }
    
    // Mostrar tests exitosos
    const passed = this.testResults.filter(r => r.success);
    if (passed.length > 0) {
      console.log('✅ TESTS EXITOSOS:');
      passed.forEach(test => {
        console.log(`  - ${test.test}`);
      });
      console.log('');
    }
    
    if (successRate >= 80) {
      console.log('🎉 ¡Integración OSM funcionando correctamente!');
    } else if (successRate >= 60) {
      console.log('⚠️  Integración OSM parcialmente funcional. Revisar tests fallidos.');
    } else {
      console.log('🚨 Integración OSM con problemas significativos. Revisar configuración.');
    }
    
    console.log('\n💡 Próximos pasos:');
    console.log('  1. Probar endpoints API: npm run dev');
    console.log('  2. Ejecutar: curl http://localhost:3000/api/osm/health');
    console.log('  3. Generar ruta de prueba con POST /api/osm/generate-realistic-route');
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  const tester = new OSMIntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OSMIntegrationTester;
