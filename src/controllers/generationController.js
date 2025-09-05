const express = require('express');
const Agency = require('../models/Agency');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/generate/agency - Generar una agencia
router.post('/agency', async (req, res, next) => {
  try {
    const { name, description, city, country, url, phone, email } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la agencia es requerido'
      });
    }
    
    const agencyData = {
      agency_name: name,
      agency_url: url || 'https://ejemplo.com',
      agency_timezone: 'America/Mexico_City',
      agency_lang: 'es',
      description,
      city,
      country: country || 'México',
      agency_phone: phone,
      agency_email: email,
      ai_generated: true
    };
    
    const agency = new Agency(agencyData);
    await agency.save();
    
    logger.info(`Agencia generada: ${agency.agency_name} (${agency.agency_id})`);
    
    res.status(201).json({
      success: true,
      message: 'Agencia generada exitosamente',
      data: agency
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/generate/routes - Generar rutas
router.post('/routes', async (req, res, next) => {
  try {
    const { agency_id, route_count = 5, route_types = [1, 3] } = req.body;
    
    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: 'El agency_id es requerido'
      });
    }
    
    const agency = await Agency.findOne({ agency_id });
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agencia no encontrada'
      });
    }
    
    const routes = [];
    const routeNames = [
      'Línea 1 - Norte-Sur',
      'Línea 2 - Este-Oeste',
      'Línea 3 - Circular',
      'Ruta 4 - Centro',
      'Ruta 5 - Periférico',
      'Ruta 6 - Universidad',
      'Ruta 7 - Aeropuerto',
      'Ruta 8 - Terminal'
    ];
    
    for (let i = 0; i < route_count; i++) {
      const routeType = route_types[Math.floor(Math.random() * route_types.length)];
      const routeData = {
        agency_id,
        route_short_name: `R${i + 1}`,
        route_long_name: routeNames[i] || `Ruta ${i + 1}`,
        route_desc: `Ruta de transporte público generada automáticamente`,
        route_type: routeType,
        route_color: generateRandomColor(),
        route_text_color: 'FFFFFF',
        ai_generated: true
      };
      
      const route = new Route(routeData);
      await route.save();
      routes.push(route);
    }
    
    logger.info(`${routes.length} rutas generadas para agencia ${agency_id}`);
    
    res.status(201).json({
      success: true,
      message: `${routes.length} rutas generadas exitosamente`,
      data: routes
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/generate/stops - Generar paradas
router.post('/stops', async (req, res, next) => {
  try {
    const { stop_count = 20, city_center = { lat: 19.4326, lon: -99.1332 } } = req.body;
    
    const stops = [];
    const stopNames = [
      'Centro Histórico',
      'Zócalo',
      'Bellas Artes',
      'Alameda Central',
      'Reforma',
      'Chapultepec',
      'Polanco',
      'Condesa',
      'Roma',
      'Coyoacán',
      'San Ángel',
      'Universidad',
      'Aeropuerto',
      'Terminal Norte',
      'Terminal Sur',
      'Terminal Oriente',
      'Terminal Poniente',
      'Mercado Central',
      'Plaza Mayor',
      'Estación Central'
    ];
    
    for (let i = 0; i < stop_count; i++) {
      const stopData = {
        stop_name: stopNames[i] || `Parada ${i + 1}`,
        stop_desc: `Parada de transporte público`,
        stop_lat: city_center.lat + (Math.random() - 0.5) * 0.1,
        stop_lon: city_center.lon + (Math.random() - 0.5) * 0.1,
        location_type: 0,
        wheelchair_boarding: Math.random() > 0.5 ? 1 : 0,
        ai_generated: true
      };
      
      const stop = new Stop(stopData);
      await stop.save();
      stops.push(stop);
    }
    
    logger.info(`${stops.length} paradas generadas`);
    
    res.status(201).json({
      success: true,
      message: `${stops.length} paradas generadas exitosamente`,
      data: stops
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/generate/complete - Generar feed GTFS completo
router.post('/complete', async (req, res, next) => {
  try {
    const { 
      agency_name, 
      city, 
      route_count = 5, 
      stop_count = 20,
      city_center = { lat: 19.4326, lon: -99.1332 }
    } = req.body;
    
    if (!agency_name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la agencia es requerido'
      });
    }
    
    // 1. Crear agencia
    const agencyData = {
      agency_name,
      agency_url: 'https://ejemplo.com',
      agency_timezone: 'America/Mexico_City',
      agency_lang: 'es',
      city,
      country: 'México',
      ai_generated: true
    };
    
    const agency = new Agency(agencyData);
    await agency.save();
    
    // 2. Generar rutas
    const routes = [];
    for (let i = 0; i < route_count; i++) {
      const routeData = {
        agency_id: agency.agency_id,
        route_short_name: `R${i + 1}`,
        route_long_name: `Ruta ${i + 1}`,
        route_type: Math.random() > 0.5 ? 1 : 3, // Metro o Bus
        route_color: generateRandomColor(),
        ai_generated: true
      };
      
      const route = new Route(routeData);
      await route.save();
      routes.push(route);
    }
    
    // 3. Generar paradas
    const stops = [];
    for (let i = 0; i < stop_count; i++) {
      const stopData = {
        stop_name: `Parada ${i + 1}`,
        stop_lat: city_center.lat + (Math.random() - 0.5) * 0.1,
        stop_lon: city_center.lon + (Math.random() - 0.5) * 0.1,
        ai_generated: true
      };
      
      const stop = new Stop(stopData);
      await stop.save();
      stops.push(stop);
    }
    
    logger.info(`Feed GTFS completo generado: ${agency_name} con ${routes.length} rutas y ${stops.length} paradas`);
    
    res.status(201).json({
      success: true,
      message: 'Feed GTFS completo generado exitosamente',
      data: {
        agency,
        routes,
        stops,
        summary: {
          agency_name: agency.agency_name,
          routes_count: routes.length,
          stops_count: stops.length,
          generated_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Función auxiliar para generar colores aleatorios
function generateRandomColor() {
  return Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
}

module.exports = router;
