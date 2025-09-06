const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./config/logger');
const connectDB = require('./config/database');
const errorHandler = require('./config/errorHandler');

// Importar rutas
const cityRoutes = require('./controllers/cityController');
const gtfsRoutes = require('./controllers/gtfsController');
const generationRoutes = require('./controllers/generationController');
const OSMController = require('./controllers/osmController');
const osmController = new OSMController();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de requests por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    message: 'GTFS AI Generator API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      generate: '/api/generate',
      gtfs: '/api/gtfs'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Rutas de la API
app.use('/api/cities', cityRoutes);
app.use('/api/generate', generationRoutes);
app.use('/api/gtfs', gtfsRoutes);

// Rutas OSM
app.post('/api/osm/generate-realistic-route', osmController.generateRealisticRoute.bind(osmController));
app.post('/api/osm/improve-route/:routeId', osmController.improveRoute.bind(osmController));
app.post('/api/osm/validate-route', osmController.validateRoute.bind(osmController));
app.post('/api/osm/generate-city-realistic', osmController.generateCityRealistic.bind(osmController));
app.get('/api/osm/geocode', osmController.geocode.bind(osmController));
app.get('/api/osm/geocode-candidates', osmController.geocodeCandidates.bind(osmController));
app.post('/api/osm/advanced-search', osmController.advancedSearch.bind(osmController));
app.get('/api/osm/reverse-geocode', osmController.reverseGeocode.bind(osmController));
app.post('/api/osm/route', osmController.calculateRoute.bind(osmController));
app.get('/api/osm/nearby-poi', osmController.findNearbyPOI.bind(osmController));
app.get('/api/osm/health', osmController.healthCheck.bind(osmController));

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/cities/generate',
      'GET /api/cities',
      'GET /api/cities/:id',
      'GET /api/cities/:id/export',
      'GET /api/cities/:id/preview',
      'DELETE /api/cities/:id',
      'POST /api/generate/agency',
      'POST /api/generate/routes',
      'POST /api/generate/stops',
      'POST /api/generate/complete',
      'GET /api/gtfs/agencies',
      'GET /api/gtfs/routes',
      'GET /api/gtfs/stops',
      'GET /api/gtfs/export',
      'POST /api/osm/generate-realistic-route',
      'POST /api/osm/improve-route/:routeId',
      'POST /api/osm/validate-route',
      'POST /api/osm/generate-city-realistic',
      'GET /api/osm/geocode',
      'GET /api/osm/geocode-candidates',
      'POST /api/osm/advanced-search',
      'GET /api/osm/reverse-geocode',
      'POST /api/osm/route',
      'GET /api/osm/nearby-poi',
      'GET /api/osm/health'
    ]
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Función para iniciar el servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
      logger.info(`📊 Entorno: ${process.env.NODE_ENV}`);
      logger.info(`🌐 API disponible en: http://localhost:${PORT}`);
      logger.info(`📋 Documentación: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
