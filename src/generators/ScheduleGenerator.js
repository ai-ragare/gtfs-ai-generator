const { PromptTemplate } = require('@langchain/core/prompts');
const moment = require('moment');
const logger = require('../config/logger');

class ScheduleGenerator {
  constructor(llm) {
    this.llm = llm;
    this.setupPrompts();
  }

  setupPrompts() {
    this.scheduleGenerationPrompt = PromptTemplate.fromTemplate(`
Como experto en planificación de horarios de transporte público, genera horarios realistas para las rutas de la ciudad "{cityName}".

Rutas disponibles:
{routes}

Paradas disponibles:
{stops}

Parámetros de operación:
- Horarios: {operatingHours}
- Idioma: {language}
- Densidad poblacional: {populationDensity}

Genera un JSON con horarios que incluyan:
{{
  "trips": [
    {{
      "trip_id": "trip_1",
      "route_id": "route_1",
      "service_id": "service_weekday",
      "trip_headsign": "Centro",
      "direction_id": 0,
      "block_id": "block_1",
      "shape_id": "shape_1"
    }}
  ],
  "stop_times": [
    {{
      "trip_id": "trip_1",
      "arrival_time": "05:00:00",
      "departure_time": "05:00:00",
      "stop_id": "stop_1",
      "stop_sequence": 1,
      "pickup_type": 0,
      "drop_off_type": 0
    }}
  ],
  "calendar": [
    {{
      "service_id": "service_weekday",
      "monday": 1,
      "tuesday": 1,
      "wednesday": 1,
      "thursday": 1,
      "friday": 1,
      "saturday": 0,
      "sunday": 0,
      "start_date": "20240101",
      "end_date": "20241231"
    }}
  ]
}}

Considera:
- Frecuencias apropiadas según hora del día
- Tiempos de viaje realistas entre paradas
- Horarios de servicio diferenciados (laborables vs fines de semana)
- Direcciones lógicas de los viajes
- Secuencias de paradas coherentes
    `);
  }

  async generateSchedules(routes, params) {
    try {
      const prompt = await this.scheduleGenerationPrompt.format({
        cityName: params.cityName,
        routes: JSON.stringify(routes, null, 2),
        stops: JSON.stringify(params.stops || [], null, 2),
        operatingHours: JSON.stringify(params.operatingHours),
        language: params.language || 'es',
        populationDensity: params.populationDensity
      });

      const response = await this.llm.invoke(prompt);
      const schedules = this.parseSchedules(response.content, routes, params);
      
      logger.info(`Horarios generados: ${schedules.trips.length} viajes, ${schedules.stopTimes.length} horarios de paradas`);
      return schedules;
      
    } catch (error) {
      logger.error('Error generando horarios:', error);
      return this.generateFallbackSchedules(routes, params);
    }
  }

  parseSchedules(response, routes, params) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      
      const scheduleData = JSON.parse(jsonMatch[0]);
      return this.processSchedules(scheduleData, routes, params);
    } catch (error) {
      logger.error('Error parseando horarios:', error);
      return this.generateFallbackSchedules(routes, params);
    }
  }

  processSchedules(scheduleData, routes, params) {
    const trips = scheduleData.trips || [];
    const stopTimes = scheduleData.stop_times || [];
    const calendar = scheduleData.calendar || [];

    return {
      trips: this.processTrips(trips, routes),
      stopTimes: this.processStopTimes(stopTimes, routes),
      calendar: this.processCalendar(calendar)
    };
  }

  generateFallbackSchedules(routes, params) {
    const trips = [];
    const stopTimes = [];
    const calendar = this.generateDefaultCalendar();

    routes.forEach((route, routeIndex) => {
      const routeTrips = this.generateTripsForRoute(route, params);
      trips.push(...routeTrips);

      routeTrips.forEach(trip => {
        const tripStopTimes = this.generateStopTimesForTrip(trip, route, params);
        stopTimes.push(...tripStopTimes);
      });
    });

    return {
      trips,
      stopTimes,
      calendar
    };
  }

  generateTripsForRoute(route, params) {
    const trips = [];
    const operatingHours = params.operatingHours || { start: '05:00', end: '23:30' };
    const frequency = route.frequency_minutes || 10;
    
    // Generar viajes para días laborables
    const weekdayTrips = this.generateTripsForService(route, 'service_weekday', operatingHours, frequency, 0);
    trips.push(...weekdayTrips);
    
    // Generar viajes para fines de semana (menor frecuencia)
    const weekendTrips = this.generateTripsForService(route, 'service_weekend', operatingHours, frequency * 1.5, 1);
    trips.push(...weekendTrips);

    return trips;
  }

  generateTripsForService(route, serviceId, operatingHours, frequency, directionId) {
    const trips = [];
    const startTime = moment(operatingHours.start, 'HH:mm');
    const endTime = moment(operatingHours.end, 'HH:mm');
    
    let currentTime = startTime.clone();
    let tripIndex = 1;

    while (currentTime.isBefore(endTime)) {
      const trip = {
        trip_id: `${route.route_id}_${serviceId}_${directionId}_${tripIndex}`,
        route_id: route.route_id,
        service_id: serviceId,
        trip_headsign: this.generateTripHeadsign(route, directionId),
        direction_id: directionId,
        block_id: `${route.route_id}_block_${directionId}`,
        shape_id: route.shape_id,
        ai_generated: true
      };
      
      trips.push(trip);
      
      // Ajustar frecuencia según hora del día
      const adjustedFrequency = this.getAdjustedFrequency(currentTime, frequency);
      currentTime.add(adjustedFrequency, 'minutes');
      tripIndex++;
    }

    return trips;
  }

  generateStopTimesForTrip(trip, route, params) {
    const stopTimes = [];
    const stops = route.stops || [];
    
    if (stops.length === 0) {
      return stopTimes;
    }

    // Tiempo base del viaje
    const baseTime = this.getBaseTimeForTrip(trip);
    let currentTime = moment(baseTime, 'HH:mm:ss');
    
    // Tiempo promedio entre paradas (en minutos)
    const avgTimeBetweenStops = this.getAverageTimeBetweenStops(route);

    stops.forEach((stopId, stopIndex) => {
      const stopTime = {
        trip_id: trip.trip_id,
        arrival_time: currentTime.format('HH:mm:ss'),
        departure_time: currentTime.format('HH:mm:ss'),
        stop_id: stopId,
        stop_sequence: stopIndex + 1,
        pickup_type: 0,
        drop_off_type: 0,
        ai_generated: true
      };

      // Ajustar tiempo de salida para paradas intermedias
      if (stopIndex < stops.length - 1) {
        const dwellTime = this.getDwellTime(stopIndex, stops.length);
        currentTime.add(dwellTime, 'seconds');
        stopTime.departure_time = currentTime.format('HH:mm:ss');
        
        // Tiempo de viaje hasta la siguiente parada
        const travelTime = this.getTravelTime(avgTimeBetweenStops, stopIndex);
        currentTime.add(travelTime, 'minutes');
      }

      stopTimes.push(stopTime);
    });

    return stopTimes;
  }

  generateDefaultCalendar() {
    return [
      {
        service_id: 'service_weekday',
        monday: 1,
        tuesday: 1,
        wednesday: 1,
        thursday: 1,
        friday: 1,
        saturday: 0,
        sunday: 0,
        start_date: '20240101',
        end_date: '20241231',
        ai_generated: true
      },
      {
        service_id: 'service_weekend',
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 1,
        sunday: 1,
        start_date: '20240101',
        end_date: '20241231',
        ai_generated: true
      }
    ];
  }

  processTrips(trips, routes) {
    return trips.map(trip => ({
      ...trip,
      ai_generated: true
    }));
  }

  processStopTimes(stopTimes, routes) {
    return stopTimes.map(stopTime => ({
      ...stopTime,
      ai_generated: true
    }));
  }

  processCalendar(calendar) {
    return calendar.map(cal => ({
      ...cal,
      ai_generated: true
    }));
  }

  generateTripHeadsign(route, directionId) {
    const directions = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste', 'Terminal'];
    const direction = directions[directionId] || 'Centro';
    return `${route.route_long_name} - ${direction}`;
  }

  getAdjustedFrequency(currentTime, baseFrequency) {
    const hour = currentTime.hour();
    
    // Horas pico (7-9 AM, 5-7 PM) - mayor frecuencia
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      return Math.max(3, baseFrequency * 0.6);
    }
    
    // Horas valle (10 PM - 5 AM) - menor frecuencia
    if (hour >= 22 || hour < 5) {
      return baseFrequency * 2;
    }
    
    // Horas normales
    return baseFrequency;
  }

  getBaseTimeForTrip(trip) {
    // Extraer hora del trip_id o usar hora por defecto
    const tripId = trip.trip_id;
    const timeMatch = tripId.match(/(\d{2}):(\d{2})/);
    
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}:00`;
    }
    
    return '05:00:00';
  }

  getAverageTimeBetweenStops(route) {
    const routeType = route.route_type;
    
    // Tiempo promedio entre paradas según tipo de transporte
    const times = {
      1: 2,  // subway
      3: 3,  // bus
      0: 2.5 // tram
    };
    
    return times[routeType] || 3;
  }

  getDwellTime(stopIndex, totalStops) {
    // Tiempo de permanencia en parada (en segundos)
    if (stopIndex === 0 || stopIndex === totalStops - 1) {
      return 30; // Paradas terminales - más tiempo
    }
    
    return 15; // Paradas intermedias
  }

  getTravelTime(avgTimeBetweenStops, stopIndex) {
    // Variación en tiempo de viaje
    const variation = 0.5; // ±50% de variación
    const baseTime = avgTimeBetweenStops;
    const randomVariation = (Math.random() - 0.5) * variation;
    
    return Math.max(1, baseTime + randomVariation);
  }
}

module.exports = ScheduleGenerator;
