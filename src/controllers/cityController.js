const express = require('express');
const City = require('../models/City');
const GenerationRequest = require('../models/GenerationRequest');
const GTFSAgent = require('../generators/GTFSAgent');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/generate - Generar nueva ciudad GTFS
router.post('/generate', async (req, res, next) => {
  try {
    const {
      cityName,
      citySize = 'medium',
      cityType = 'mixed',
      populationDensity = 'medium',
      transportTypes = ['bus', 'subway'],
      numberOfRoutes = 10,
      operatingHours = { start: '05:00', end: '23:30' },
      touristAreas = false,
      industrialZones = false,
      language = 'es',
      country = 'México',
      timezone = 'America/Mexico_City'
    } = req.body;

    // Validar parámetros requeridos
    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la ciudad es requerido'
      });
    }

    // Crear registro de ciudad
    const city = new City({
      city_name: cityName,
      city_size: citySize,
      city_type: cityType,
      population_density: populationDensity,
      generation_parameters: {
        transport_types: transportTypes,
        number_of_routes: numberOfRoutes,
        operating_hours: operatingHours,
        tourist_areas: touristAreas,
        industrial_zones: industrialZones
      },
      language,
      country,
      timezone
    });

    await city.save();

    // Crear solicitud de generación
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generationRequest = new GenerationRequest({
      request_id: requestId,
      city_id: city.city_id,
      parameters: {
        city_name: cityName,
        city_size: citySize,
        city_type: cityType,
        population_density: populationDensity,
        transport_types: transportTypes,
        number_of_routes: numberOfRoutes,
        operating_hours: operatingHours,
        tourist_areas: touristAreas,
        industrial_zones: industrialZones,
        language
      }
    });

    await generationRequest.save();

    // Iniciar generación en background
    generateCityInBackground(city, generationRequest, country, timezone);

    res.status(202).json({
      success: true,
      message: 'Generación de ciudad iniciada',
      data: {
        city_id: city.city_id,
        request_id: generationRequest.request_id,
        status: 'processing',
        estimated_completion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos estimado
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/cities - Listar ciudades generadas
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, city_size, city_type } = req.query;
    const filter = {};

    if (status) filter.generation_status = status;
    if (city_size) filter.city_size = city_size;
    if (city_type) filter.city_type = city_type;

    const cities = await City.find(filter)
      .populate('agencies_count')
      .populate('routes_count')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await City.countDocuments(filter);

    res.json({
      success: true,
      data: cities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/cities/:id - Obtener ciudad específica
router.get('/:id', async (req, res, next) => {
  try {
    const city = await City.findOne({ city_id: req.params.id })
      .populate('agencies_count')
      .populate('routes_count');

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    res.json({
      success: true,
      data: city
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/cities/:id/export - Exportar GTFS como ZIP
router.get('/:id/export', async (req, res, next) => {
  try {
    const { format = 'zip' } = req.query;
    const city = await City.findOne({ city_id: req.params.id });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    if (city.generation_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'La ciudad aún no ha sido generada completamente'
      });
    }

    // TODO: Implementar exportación real
    // Por ahora retornamos información de la ciudad
    res.json({
      success: true,
      message: 'Exportación iniciada',
      data: {
        city_id: city.city_id,
        city_name: city.city_name,
        format,
        download_url: `/api/cities/${city.city_id}/download/${format}`
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/cities/:id/preview - Vista previa de datos
router.get('/:id/preview', async (req, res, next) => {
  try {
    const city = await City.findOne({ city_id: req.params.id });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    // Obtener datos de la ciudad
    const Agency = require('../models/Agency');
    const Route = require('../models/Route');
    const Stop = require('../models/Stop');

    const [agencies, routes, stops] = await Promise.all([
      Agency.find({ city_id: city.city_id }).limit(5),
      Route.find({ city_id: city.city_id }).limit(10),
      Stop.find({ city_id: city.city_id }).limit(20)
    ]);

    res.json({
      success: true,
      data: {
        city: {
          city_id: city.city_id,
          city_name: city.city_name,
          city_size: city.city_size,
          city_type: city.city_type,
          generation_status: city.generation_status,
          generation_progress: city.generation_progress,
          statistics: city.statistics
        },
        preview: {
          agencies: agencies.length,
          routes: routes.length,
          stops: stops.length,
          sample_agencies: agencies,
          sample_routes: routes,
          sample_stops: stops
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/cities/:id - Eliminar ciudad
router.delete('/:id', async (req, res, next) => {
  try {
    const city = await City.findOne({ city_id: req.params.id });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    // Eliminar datos relacionados
    const Agency = require('../models/Agency');
    const Route = require('../models/Route');
    const Stop = require('../models/Stop');

    await Promise.all([
      Agency.deleteMany({ city_id: city.city_id }),
      Route.deleteMany({ city_id: city.city_id }),
      Stop.deleteMany({ city_id: city.city_id }),
      GenerationRequest.deleteMany({ city_id: city.city_id })
    ]);

    await City.deleteOne({ city_id: req.params.id });

    res.json({
      success: true,
      message: 'Ciudad eliminada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Función para generar ciudad en background
async function generateCityInBackground(city, generationRequest, country, timezone) {
  try {
    const gtfsAgent = new GTFSAgent();
    
    // Actualizar progreso inicial
    await city.updateProgress(0, 'Iniciando generación de ciudad', 'info');
    await generationRequest.updateProgress('planning', 0, 'Iniciando planificación', 'info');

    // Generar ciudad
    const gtfsData = await gtfsAgent.generateCity({
      cityName: city.city_name,
      citySize: city.city_size,
      cityType: city.city_type,
      populationDensity: city.population_density,
      transportTypes: city.generation_parameters.transport_types,
      numberOfRoutes: city.generation_parameters.number_of_routes,
      operatingHours: city.generation_parameters.operating_hours,
      touristAreas: city.generation_parameters.tourist_areas,
      industrialZones: city.generation_parameters.industrial_zones,
      language: city.language,
      country,
      timezone
    });

    // Guardar datos en MongoDB
    await saveGTFSDataToMongoDB(gtfsData, city.city_id, generationRequest.request_id);

    // Actualizar estadísticas de la ciudad
    city.statistics = {
      total_routes: gtfsData.routes.length,
      total_stops: gtfsData.stops.length,
      total_trips: gtfsData.trips.length,
      coverage_area_km2: calculateCoverageArea(gtfsData.stops)
    };

    await city.updateProgress(100, 'Ciudad generada exitosamente', 'info');
    await generationRequest.updateProgress('completed', 100, 'Generación completada', 'info');

    logger.info(`Ciudad ${city.city_name} generada exitosamente`);

  } catch (error) {
    logger.error('Error generando ciudad:', error);
    await city.markAsFailed(error.message);
    await generationRequest.markAsFailed(error, 'generation');
  }
}

// Función para guardar datos GTFS en MongoDB
async function saveGTFSDataToMongoDB(gtfsData, cityId, requestId) {
  const Agency = require('../models/Agency');
  const Route = require('../models/Route');
  const Stop = require('../models/Stop');

  // Guardar agencia
  if (gtfsData.agency) {
    const agency = new Agency({
      ...gtfsData.agency,
      agency_id: `agency_${Date.now()}`,
      city_id: cityId,
      generation_request_id: requestId
    });
    await agency.save();
  }

  // Guardar rutas
  if (gtfsData.routes && gtfsData.routes.length > 0) {
    const routes = gtfsData.routes.map(route => ({
      ...route,
      city_id: cityId,
      generation_request_id: requestId
    }));
    await Route.insertMany(routes);
  }

  // Guardar paradas
  if (gtfsData.stops && gtfsData.stops.length > 0) {
    const stops = gtfsData.stops.map(stop => ({
      ...stop,
      city_id: cityId,
      generation_request_id: requestId
    }));
    await Stop.insertMany(stops);
  }
}

// Función para calcular área de cobertura
function calculateCoverageArea(stops) {
  if (!stops || stops.length < 2) return 0;
  
  const lats = stops.map(s => s.stop_lat);
  const lons = stops.map(s => s.stop_lon);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  
  // Cálculo aproximado del área en km²
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;
  
  // Conversión aproximada a km (1 grado ≈ 111 km)
  const areaKm2 = latDiff * lonDiff * 111 * 111;
  
  return Math.round(areaKm2 * 100) / 100;
}

module.exports = router;
