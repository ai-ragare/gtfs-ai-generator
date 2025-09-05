const logger = require('../config/logger');

class CoordinateGenerator {
  constructor() {
    // Coordenadas base para diferentes ciudades (lat, lon)
    this.cityCoordinates = {
      'mexico_city': { lat: 19.4326, lon: -99.1332, radius: 0.1 },
      'madrid': { lat: 40.4168, lon: -3.7038, radius: 0.08 },
      'valencia': { lat: 39.4699, lon: -0.3763, radius: 0.06 },
      'barcelona': { lat: 41.3851, lon: 2.1734, radius: 0.07 },
      'buenos_aires': { lat: -34.6118, lon: -58.3960, radius: 0.09 },
      'default': { lat: 19.4326, lon: -99.1332, radius: 0.05 }
    };
  }

  async generateCoordinates(cityLayout, citySize) {
    try {
      const baseCoords = this.getBaseCoordinates(cityLayout);
      const sizeMultiplier = this.getSizeMultiplier(citySize);
      
      // Generar paradas
      const stops = this.generateStops(cityLayout, baseCoords, sizeMultiplier);
      
      // Generar formas (shapes) para las rutas
      const shapes = this.generateShapes(cityLayout, stops);
      
      logger.info(`${stops.length} paradas y ${shapes.length} formas generadas`);
      
      return {
        stops,
        shapes,
        baseCoordinates: baseCoords
      };
      
    } catch (error) {
      logger.error('Error generando coordenadas:', error);
      throw error;
    }
  }

  getBaseCoordinates(cityLayout) {
    // Intentar extraer coordenadas de la ciudad del layout
    const cityName = cityLayout.agency?.agency_name?.toLowerCase() || 'default';
    
    // Buscar coordenadas conocidas
    for (const [city, coords] of Object.entries(this.cityCoordinates)) {
      if (cityName.includes(city.replace('_', ' '))) {
        return coords;
      }
    }
    
    return this.cityCoordinates.default;
  }

  getSizeMultiplier(citySize) {
    const multipliers = {
      'small': 0.5,
      'medium': 1.0,
      'large': 1.5,
      'mega': 2.0
    };
    
    return multipliers[citySize] || 1.0;
  }

  generateStops(cityLayout, baseCoords, sizeMultiplier) {
    const stops = [];
    const zones = cityLayout.zones || [];
    const pointsOfInterest = cityLayout.points_of_interest || [];
    
    // Generar paradas por zona
    zones.forEach((zone, zoneIndex) => {
      const stopsInZone = this.getStopsPerZone(zone, sizeMultiplier);
      
      for (let i = 0; i < stopsInZone; i++) {
        const stop = this.generateStopInZone(zone, baseCoords, sizeMultiplier, i);
        stops.push(stop);
      }
    });
    
    // Asegurar puntos de interés tengan paradas
    pointsOfInterest.forEach((poi, poiIndex) => {
      const existingStop = stops.find(stop => 
        stop.stop_name.toLowerCase().includes(poi.poi_name.toLowerCase())
      );
      
      if (!existingStop) {
        const poiStop = this.generatePOIStop(poi, baseCoords, sizeMultiplier);
        stops.push(poiStop);
      }
    });
    
    // Generar paradas adicionales para completar la red
    const additionalStops = this.generateAdditionalStops(baseCoords, sizeMultiplier, stops.length);
    stops.push(...additionalStops);
    
    return stops;
  }

  getStopsPerZone(zone, sizeMultiplier) {
    const baseStops = {
      'commercial': 8,
      'residential': 6,
      'industrial': 4,
      'tourist': 5,
      'mixed': 7
    };
    
    const baseCount = baseStops[zone.zone_type] || 5;
    return Math.floor(baseCount * sizeMultiplier);
  }

  generateStopInZone(zone, baseCoords, sizeMultiplier, stopIndex) {
    const zoneCenter = this.getZoneCenter(zone, baseCoords, sizeMultiplier);
    const variation = 0.01 * sizeMultiplier; // Variación en grados
    
    const lat = zoneCenter.lat + (Math.random() - 0.5) * variation;
    const lon = zoneCenter.lon + (Math.random() - 0.5) * variation;
    
    return {
      stop_id: `stop_${zone.zone_id}_${stopIndex + 1}`,
      stop_code: `${zone.zone_id.toUpperCase()}${(stopIndex + 1).toString().padStart(2, '0')}`,
      stop_name: this.generateStopName(zone, stopIndex),
      stop_desc: `Parada en ${zone.zone_name}`,
      stop_lat: this.roundCoordinate(lat),
      stop_lon: this.roundCoordinate(lon),
      zone_id: zone.zone_id,
      location_type: 0,
      wheelchair_boarding: Math.random() > 0.3 ? 1 : 0,
      ai_generated: true
    };
  }

  generatePOIStop(poi, baseCoords, sizeMultiplier) {
    const poiCenter = this.getPOICenter(poi, baseCoords, sizeMultiplier);
    const variation = 0.005 * sizeMultiplier;
    
    const lat = poiCenter.lat + (Math.random() - 0.5) * variation;
    const lon = poiCenter.lon + (Math.random() - 0.5) * variation;
    
    return {
      stop_id: `stop_${poi.poi_id}`,
      stop_code: poi.poi_id.toUpperCase(),
      stop_name: poi.poi_name,
      stop_desc: poi.description,
      stop_lat: this.roundCoordinate(lat),
      stop_lon: this.roundCoordinate(lon),
      zone_id: poi.zone_id,
      location_type: this.getLocationTypeForPOI(poi.poi_type),
      wheelchair_boarding: 1, // Puntos de interés suelen ser accesibles
      ai_generated: true
    };
  }

  generateAdditionalStops(baseCoords, sizeMultiplier, currentCount) {
    const additionalCount = Math.floor(5 * sizeMultiplier);
    const stops = [];
    
    for (let i = 0; i < additionalCount; i++) {
      const variation = 0.08 * sizeMultiplier;
      const lat = baseCoords.lat + (Math.random() - 0.5) * variation;
      const lon = baseCoords.lon + (Math.random() - 0.5) * variation;
      
      stops.push({
        stop_id: `stop_additional_${currentCount + i + 1}`,
        stop_code: `ADD${(currentCount + i + 1).toString().padStart(3, '0')}`,
        stop_name: `Parada ${currentCount + i + 1}`,
        stop_desc: 'Parada adicional de la red',
        stop_lat: this.roundCoordinate(lat),
        stop_lon: this.roundCoordinate(lon),
        zone_id: 'zone_mixed',
        location_type: 0,
        wheelchair_boarding: Math.random() > 0.4 ? 1 : 0,
        ai_generated: true
      });
    }
    
    return stops;
  }

  getZoneCenter(zone, baseCoords, sizeMultiplier) {
    // Distribuir zonas en un patrón lógico alrededor del centro
    const zonePositions = {
      'commercial': { offsetLat: 0, offsetLon: 0 }, // Centro
      'residential': { offsetLat: 0.03, offsetLon: 0.02 }, // Norte-Este
      'industrial': { offsetLat: -0.02, offsetLon: -0.03 }, // Sur-Oeste
      'tourist': { offsetLat: 0.01, offsetLon: -0.01 }, // Centro-Oeste
      'mixed': { offsetLat: 0, offsetLon: 0.01 } // Centro-Este
    };
    
    const position = zonePositions[zone.zone_type] || { offsetLat: 0, offsetLon: 0 };
    const multiplier = sizeMultiplier;
    
    return {
      lat: baseCoords.lat + position.offsetLat * multiplier,
      lon: baseCoords.lon + position.offsetLon * multiplier
    };
  }

  getPOICenter(poi, baseCoords, sizeMultiplier) {
    // Los POIs se distribuyen cerca de sus zonas
    const zone = poi.zone_id;
    const variation = 0.01 * sizeMultiplier;
    
    return {
      lat: baseCoords.lat + (Math.random() - 0.5) * variation,
      lon: baseCoords.lon + (Math.random() - 0.5) * variation
    };
  }

  generateStopName(zone, stopIndex) {
    const stopTypes = ['Parada', 'Estación', 'Terminal', 'Centro'];
    const stopType = stopTypes[stopIndex % stopTypes.length];
    
    return `${stopType} ${zone.zone_name} ${stopIndex + 1}`;
  }

  getLocationTypeForPOI(poiType) {
    const locationTypes = {
      'transport_hub': 1, // Station
      'commercial': 0,    // Stop
      'educational': 0,   // Stop
      'healthcare': 0,    // Stop
      'tourist': 0        // Stop
    };
    
    return locationTypes[poiType] || 0;
  }

  generateShapes(cityLayout, stops) {
    const shapes = [];
    const routes = cityLayout.route_planning?.primary_routes || [];
    
    routes.forEach((route, routeIndex) => {
      const shape = this.generateShapeForRoute(route, stops, routeIndex);
      shapes.push(shape);
    });
    
    return shapes;
  }

  generateShapeForRoute(route, stops, routeIndex) {
    const shapeId = `shape_${routeIndex + 1}`;
    const routeStops = this.getStopsForRoute(stops, routeIndex);
    
    if (routeStops.length < 2) {
      return null;
    }
    
    // Generar puntos intermedios para crear una ruta más realista
    const shapePoints = this.interpolateRoutePoints(routeStops);
    
    return {
      shape_id: shapeId,
      shape_pt_sequence: shapePoints.map((point, index) => ({
        shape_pt_lat: point.lat,
        shape_pt_lon: point.lon,
        shape_pt_sequence: index + 1,
        shape_dist_traveled: this.calculateDistanceTraveled(shapePoints, index)
      }))
    };
  }

  getStopsForRoute(stops, routeIndex) {
    // Asignar paradas a rutas de manera lógica
    const stopsPerRoute = Math.floor(stops.length / 5); // Asumiendo 5 rutas
    const startIndex = routeIndex * stopsPerRoute;
    const endIndex = Math.min(startIndex + stopsPerRoute, stops.length);
    
    return stops.slice(startIndex, endIndex);
  }

  interpolateRoutePoints(routeStops) {
    const points = [];
    
    for (let i = 0; i < routeStops.length - 1; i++) {
      const currentStop = routeStops[i];
      const nextStop = routeStops[i + 1];
      
      // Punto inicial
      points.push({
        lat: currentStop.stop_lat,
        lon: currentStop.stop_lon
      });
      
      // Puntos intermedios (2-3 puntos entre paradas)
      const intermediatePoints = 2 + Math.floor(Math.random() * 2);
      for (let j = 1; j <= intermediatePoints; j++) {
        const ratio = j / (intermediatePoints + 1);
        const lat = currentStop.stop_lat + (nextStop.stop_lat - currentStop.stop_lat) * ratio;
        const lon = currentStop.stop_lon + (nextStop.stop_lon - currentStop.stop_lon) * ratio;
        
        // Añadir pequeña variación para simular calles reales
        const variation = 0.001;
        points.push({
          lat: lat + (Math.random() - 0.5) * variation,
          lon: lon + (Math.random() - 0.5) * variation
        });
      }
    }
    
    // Punto final
    const lastStop = routeStops[routeStops.length - 1];
    points.push({
      lat: lastStop.stop_lat,
      lon: lastStop.stop_lon
    });
    
    return points;
  }

  calculateDistanceTraveled(shapePoints, pointIndex) {
    let totalDistance = 0;
    
    for (let i = 1; i <= pointIndex; i++) {
      const prevPoint = shapePoints[i - 1];
      const currentPoint = shapePoints[i];
      const distance = this.calculateDistance(prevPoint.lat, prevPoint.lon, currentPoint.lat, currentPoint.lon);
      totalDistance += distance;
    }
    
    return Math.round(totalDistance * 1000); // Convertir a metros
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  roundCoordinate(coord) {
    return Math.round(coord * 1000000) / 1000000; // 6 decimales de precisión
  }
}

module.exports = CoordinateGenerator;
