const express = require('express');
const Agency = require('../models/Agency');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const logger = require('../config/logger');
const City = require('../models/City');
const DataExporter = require('../generators/DataExporter');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// GET /api/gtfs/agencies - Obtener todas las agencias
router.get('/agencies', async (req, res, next) => {
  try {
    const agencies = await Agency.find({ is_active: true })
      .populate('routes_count')
      .sort({ agency_name: 1 });
    
    res.json({
      success: true,
      count: agencies.length,
      data: agencies
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/gtfs/routes - Obtener todas las rutas
router.get('/routes', async (req, res, next) => {
  try {
    const { agency_id, route_type } = req.query;
    const filter = { is_active: true };
    
    if (agency_id) filter.agency_id = agency_id;
    if (route_type) filter.route_type = parseInt(route_type);
    
    const routes = await Route.find(filter)
      .populate('agency_id', 'agency_name')
      .sort({ route_long_name: 1 });
    
    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/gtfs/stops - Obtener todas las paradas
router.get('/stops', async (req, res, next) => {
  try {
    const { location_type, lat, lon, radius } = req.query;
    const filter = { is_active: true };
    
    if (location_type) filter.location_type = parseInt(location_type);
    
    let stops = await Stop.find(filter).sort({ stop_name: 1 });
    
    // Filtrar por proximidad si se proporcionan coordenadas
    if (lat && lon && radius) {
      const centerLat = parseFloat(lat);
      const centerLon = parseFloat(lon);
      const searchRadius = parseFloat(radius);
      
      stops = stops.filter(stop => {
        const distance = calculateDistance(centerLat, centerLon, stop.stop_lat, stop.stop_lon);
        return distance <= searchRadius;
      });
    }
    
    res.json({
      success: true,
      count: stops.length,
      data: stops
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/gtfs/export - Exportar datos GTFS
router.get('/export', async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    
    if (format === 'csv') {
      // TODO: Implementar exportación a CSV
      res.status(501).json({
        success: false,
        message: 'Exportación a CSV no implementada aún'
      });
    } else {
      // Exportar como JSON
      const [agencies, routes, stops] = await Promise.all([
        Agency.find({ is_active: true }),
        Route.find({ is_active: true }),
        Stop.find({ is_active: true })
      ]);
      
      res.json({
        success: true,
        data: {
          agencies,
          routes,
          stops,
          exported_at: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// NEW ENDPOINT: GET /api/gtfs/export-city/:cityId - Exportar datos GTFS para una ciudad específica
router.get('/export-city/:cityId', async (req, res, next) => {
  try {
    const { cityId } = req.params;

    // 1. Find the city
    const city = await City.findOne({ city_id: cityId });
    if (!city) {
      return res.status(404).json({ success: false, message: 'Ciudad no encontrada.' });
    }

    // 2. Instantiate DataExporter and zip the generated GTFS files
    const exporter = new DataExporter();
    const exportResult = await exporter.zipGeneratedGTFS(city.city_name);

    // 3. Send the generated ZIP file as a response
    if (exportResult.filePath && fs.existsSync(exportResult.filePath)) {
      res.download(exportResult.filePath, `${city.city_name.replace(/\s+/g, '_')}_gtfs.zip`, (err) => {
        if (err) {
          logger.error(`Error al enviar el archivo GTFS ZIP para ${city.city_name}:`, err);
          // Clean up the generated file if there was an error sending it
          fs.unlink(exportResult.filePath, (unlinkErr) => {
            if (unlinkErr) logger.error(`Error al eliminar el archivo temporal: ${exportResult.filePath}`, unlinkErr);
          });
          next(err); // Pass error to error handling middleware
        } else {
          logger.info(`Archivo GTFS ZIP para ${city.city_name} enviado exitosamente.`);
          // Clean up the generated file after successful download
          fs.unlink(exportResult.filePath, (unlinkErr) => {
            if (unlinkErr) logger.error(`Error al eliminar el archivo temporal: ${exportResult.filePath}`, unlinkErr);
          });
        }
      });
    } else {
      res.status(500).json({ success: false, message: 'Error al generar el archivo GTFS ZIP.' });
    }

  } catch (error) {
    logger.error('Error en la exportación GTFS por ciudad:', error);
    next(error);
  }
});

// Función auxiliar para calcular distancia entre coordenadas
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
