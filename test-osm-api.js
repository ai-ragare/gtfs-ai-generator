#!/usr/bin/env node

/**
 * Servidor simple para probar solo funcionalidad OSM
 * Sin MongoDB, solo endpoints OSM
 * Ejecutar con: node test-osm-api.js
 */

const express = require('express');
const cors = require('cors');
const OSMController = require('./src/controllers/osmController');

const app = express();
const PORT = 3001; // Puerto diferente para evitar conflictos

// Middleware básico
app.use(cors());
app.use(express.json());

// Crear instancia del controlador OSM
const osmController = new OSMController();

// Rutas OSM
app.post('/api/osm/generate-realistic-route', osmController.generateRealisticRoute.bind(osmController));
app.post('/api/osm/improve-route/:routeId', osmController.improveRoute.bind(osmController));
app.post('/api/osm/validate-route', osmController.validateRoute.bind(osmController));
app.get('/api/osm/geocode', osmController.geocode.bind(osmController));
app.get('/api/osm/reverse-geocode', osmController.reverseGeocode.bind(osmController));
app.post('/api/osm/route', osmController.calculateRoute.bind(osmController));
app.get('/api/osm/nearby-poi', osmController.findNearbyPOI.bind(osmController));
app.get('/api/osm/health', osmController.healthCheck.bind(osmController));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🚌 GTFS AI Generator - Solo OSM',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/osm/health',
      geocode: '/api/osm/geocode?address=Madrid, España',
      generateRoute: 'POST /api/osm/generate-realistic-route'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor OSM iniciado en puerto ${PORT}`);
  console.log(`🌐 API disponible en: http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/osm/health`);
  console.log(`🗺️ Geocoding: http://localhost:${PORT}/api/osm/geocode?address=Madrid, España`);
});
