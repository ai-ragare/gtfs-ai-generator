const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class DataExporter {
  constructor() {
    this.gtfsFiles = [
      'agency.txt',
      'routes.txt',
      'stops.txt',
      'trips.txt',
      'stop_times.txt',
      'calendar.txt',
      'shapes.txt',
      'feed_info.txt'
    ];
  }

  async exportToGTFS(gtfsData, format = 'csv') {
    try {
      if (format === 'csv') {
        return await this.exportToCSV(gtfsData);
      } else if (format === 'zip') {
        return await this.exportToZIP(gtfsData);
      } else {
        throw new Error(`Formato no soportado: ${format}`);
      }
    } catch (error) {
      logger.error('Error exportando GTFS:', error);
      throw error;
    }
  }

  async exportToCSV(gtfsData) {
    const outputDir = path.join(process.cwd(), 'generated-gtfs', gtfsData.city.name.replace(/\s+/g, '_'));
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const exportedFiles = [];

    // Exportar agency.txt
    if (gtfsData.agency) {
      const agencyFile = await this.exportAgency(gtfsData.agency, outputDir);
      exportedFiles.push(agencyFile);
    }

    // Exportar routes.txt
    if (gtfsData.routes && gtfsData.routes.length > 0) {
      const routesFile = await this.exportRoutes(gtfsData.routes, outputDir);
      exportedFiles.push(routesFile);
    }

    // Exportar stops.txt
    if (gtfsData.stops && gtfsData.stops.length > 0) {
      const stopsFile = await this.exportStops(gtfsData.stops, outputDir);
      exportedFiles.push(stopsFile);
    }

    // Exportar trips.txt
    if (gtfsData.trips && gtfsData.trips.length > 0) {
      const tripsFile = await this.exportTrips(gtfsData.trips, outputDir);
      exportedFiles.push(tripsFile);
    }

    // Exportar stop_times.txt
    if (gtfsData.stopTimes && gtfsData.stopTimes.length > 0) {
      const stopTimesFile = await this.exportStopTimes(gtfsData.stopTimes, outputDir);
      exportedFiles.push(stopTimesFile);
    }

    // Exportar calendar.txt
    if (gtfsData.calendar && gtfsData.calendar.length > 0) {
      const calendarFile = await this.exportCalendar(gtfsData.calendar, outputDir);
      exportedFiles.push(calendarFile);
    }

    // Exportar shapes.txt
    if (gtfsData.shapes && gtfsData.shapes.length > 0) {
      const shapesFile = await this.exportShapes(gtfsData.shapes, outputDir);
      exportedFiles.push(shapesFile);
    }

    // Exportar feed_info.txt
    const feedInfoFile = await this.exportFeedInfo(gtfsData, outputDir);
    exportedFiles.push(feedInfoFile);

    logger.info(`GTFS exportado a CSV: ${exportedFiles.length} archivos en ${outputDir}`);
    
    return {
      format: 'csv',
      outputDir,
      files: exportedFiles,
      cityName: gtfsData.city.name
    };
  }

  async exportToZIP(gtfsData) {
    const csvExport = await this.exportToCSV(gtfsData);
    const zipPath = path.join(csvExport.outputDir, `${gtfsData.city.name.replace(/\s+/g, '_')}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`GTFS exportado a ZIP: ${archive.pointer()} bytes`);
        resolve({
          format: 'zip',
          filePath: zipPath,
          size: archive.pointer(),
          cityName: gtfsData.city.name
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Añadir todos los archivos CSV al ZIP
      csvExport.files.forEach(file => {
        archive.file(file.path, { name: path.basename(file.path) });
      });

      archive.finalize();
    });
  }

  async exportAgency(agency, outputDir) {
    const filePath = path.join(outputDir, 'agency.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'agency_id', title: 'agency_id' },
        { id: 'agency_name', title: 'agency_name' },
        { id: 'agency_url', title: 'agency_url' },
        { id: 'agency_timezone', title: 'agency_timezone' },
        { id: 'agency_lang', title: 'agency_lang' },
        { id: 'agency_phone', title: 'agency_phone' },
        { id: 'agency_fare_url', title: 'agency_fare_url' },
        { id: 'agency_email', title: 'agency_email' }
      ]
    });

    const agencyData = {
      agency_id: agency.agency_id || 'agency_1',
      agency_name: agency.agency_name,
      agency_url: agency.agency_url,
      agency_timezone: agency.agency_timezone,
      agency_lang: agency.agency_lang,
      agency_phone: agency.agency_phone || '',
      agency_fare_url: agency.agency_fare_url || '',
      agency_email: agency.agency_email || ''
    };

    await csvWriter.writeRecords([agencyData]);
    return { path: filePath, type: 'agency' };
  }

  async exportRoutes(routes, outputDir) {
    const filePath = path.join(outputDir, 'routes.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'route_id', title: 'route_id' },
        { id: 'agency_id', title: 'agency_id' },
        { id: 'route_short_name', title: 'route_short_name' },
        { id: 'route_long_name', title: 'route_long_name' },
        { id: 'route_desc', title: 'route_desc' },
        { id: 'route_type', title: 'route_type' },
        { id: 'route_url', title: 'route_url' },
        { id: 'route_color', title: 'route_color' },
        { id: 'route_text_color', title: 'route_text_color' }
      ]
    });

    const routesData = routes.map(route => ({
      route_id: route.route_id,
      agency_id: route.agency_id,
      route_short_name: route.route_short_name,
      route_long_name: route.route_long_name,
      route_desc: route.route_desc || '',
      route_type: route.route_type,
      route_url: route.route_url || '',
      route_color: route.route_color,
      route_text_color: route.route_text_color
    }));

    await csvWriter.writeRecords(routesData);
    return { path: filePath, type: 'routes', count: routesData.length };
  }

  async exportStops(stops, outputDir) {
    const filePath = path.join(outputDir, 'stops.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'stop_id', title: 'stop_id' },
        { id: 'stop_code', title: 'stop_code' },
        { id: 'stop_name', title: 'stop_name' },
        { id: 'stop_desc', title: 'stop_desc' },
        { id: 'stop_lat', title: 'stop_lat' },
        { id: 'stop_lon', title: 'stop_lon' },
        { id: 'zone_id', title: 'zone_id' },
        { id: 'stop_url', title: 'stop_url' },
        { id: 'location_type', title: 'location_type' },
        { id: 'parent_station', title: 'parent_station' },
        { id: 'stop_timezone', title: 'stop_timezone' },
        { id: 'wheelchair_boarding', title: 'wheelchair_boarding' }
      ]
    });

    const stopsData = stops.map(stop => ({
      stop_id: stop.stop_id,
      stop_code: stop.stop_code || '',
      stop_name: stop.stop_name,
      stop_desc: stop.stop_desc || '',
      stop_lat: stop.stop_lat,
      stop_lon: stop.stop_lon,
      zone_id: stop.zone_id || '',
      stop_url: stop.stop_url || '',
      location_type: stop.location_type || 0,
      parent_station: stop.parent_station || '',
      stop_timezone: stop.stop_timezone || '',
      wheelchair_boarding: stop.wheelchair_boarding || 0
    }));

    await csvWriter.writeRecords(stopsData);
    return { path: filePath, type: 'stops', count: stopsData.length };
  }

  async exportTrips(trips, outputDir) {
    const filePath = path.join(outputDir, 'trips.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'route_id', title: 'route_id' },
        { id: 'service_id', title: 'service_id' },
        { id: 'trip_id', title: 'trip_id' },
        { id: 'trip_headsign', title: 'trip_headsign' },
        { id: 'trip_short_name', title: 'trip_short_name' },
        { id: 'direction_id', title: 'direction_id' },
        { id: 'block_id', title: 'block_id' },
        { id: 'shape_id', title: 'shape_id' },
        { id: 'wheelchair_accessible', title: 'wheelchair_accessible' }
      ]
    });

    const tripsData = trips.map(trip => ({
      route_id: trip.route_id,
      service_id: trip.service_id,
      trip_id: trip.trip_id,
      trip_headsign: trip.trip_headsign || '',
      trip_short_name: trip.trip_short_name || '',
      direction_id: trip.direction_id || 0,
      block_id: trip.block_id || '',
      shape_id: trip.shape_id || '',
      wheelchair_accessible: trip.wheelchair_accessible || 0
    }));

    await csvWriter.writeRecords(tripsData);
    return { path: filePath, type: 'trips', count: tripsData.length };
  }

  async exportStopTimes(stopTimes, outputDir) {
    const filePath = path.join(outputDir, 'stop_times.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'trip_id', title: 'trip_id' },
        { id: 'arrival_time', title: 'arrival_time' },
        { id: 'departure_time', title: 'departure_time' },
        { id: 'stop_id', title: 'stop_id' },
        { id: 'stop_sequence', title: 'stop_sequence' },
        { id: 'stop_headsign', title: 'stop_headsign' },
        { id: 'pickup_type', title: 'pickup_type' },
        { id: 'drop_off_type', title: 'drop_off_type' },
        { id: 'continuous_pickup', title: 'continuous_pickup' },
        { id: 'continuous_drop_off', title: 'continuous_drop_off' },
        { id: 'shape_dist_traveled', title: 'shape_dist_traveled' }
      ]
    });

    const stopTimesData = stopTimes.map(stopTime => ({
      trip_id: stopTime.trip_id,
      arrival_time: stopTime.arrival_time,
      departure_time: stopTime.departure_time,
      stop_id: stopTime.stop_id,
      stop_sequence: stopTime.stop_sequence,
      stop_headsign: stopTime.stop_headsign || '',
      pickup_type: stopTime.pickup_type || 0,
      drop_off_type: stopTime.drop_off_type || 0,
      continuous_pickup: stopTime.continuous_pickup || '',
      continuous_drop_off: stopTime.continuous_drop_off || '',
      shape_dist_traveled: stopTime.shape_dist_traveled || ''
    }));

    await csvWriter.writeRecords(stopTimesData);
    return { path: filePath, type: 'stop_times', count: stopTimesData.length };
  }

  async exportCalendar(calendar, outputDir) {
    const filePath = path.join(outputDir, 'calendar.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'service_id', title: 'service_id' },
        { id: 'monday', title: 'monday' },
        { id: 'tuesday', title: 'tuesday' },
        { id: 'wednesday', title: 'wednesday' },
        { id: 'thursday', title: 'thursday' },
        { id: 'friday', title: 'friday' },
        { id: 'saturday', title: 'saturday' },
        { id: 'sunday', title: 'sunday' },
        { id: 'start_date', title: 'start_date' },
        { id: 'end_date', title: 'end_date' }
      ]
    });

    await csvWriter.writeRecords(calendar);
    return { path: filePath, type: 'calendar', count: calendar.length };
  }

  async exportShapes(shapes, outputDir) {
    const filePath = path.join(outputDir, 'shapes.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'shape_id', title: 'shape_id' },
        { id: 'shape_pt_lat', title: 'shape_pt_lat' },
        { id: 'shape_pt_lon', title: 'shape_pt_lon' },
        { id: 'shape_pt_sequence', title: 'shape_pt_sequence' },
        { id: 'shape_dist_traveled', title: 'shape_dist_traveled' }
      ]
    });

    const shapesData = [];
    shapes.forEach(shape => {
      if (shape.shape_pt_sequence) {
        shape.shape_pt_sequence.forEach(point => {
          shapesData.push({
            shape_id: shape.shape_id,
            shape_pt_lat: point.shape_pt_lat,
            shape_pt_lon: point.shape_pt_lon,
            shape_pt_sequence: point.shape_pt_sequence,
            shape_dist_traveled: point.shape_dist_traveled || ''
          });
        });
      }
    });

    await csvWriter.writeRecords(shapesData);
    return { path: filePath, type: 'shapes', count: shapesData.length };
  }

  async exportFeedInfo(gtfsData, outputDir) {
    const filePath = path.join(outputDir, 'feed_info.txt');
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'feed_publisher_name', title: 'feed_publisher_name' },
        { id: 'feed_publisher_url', title: 'feed_publisher_url' },
        { id: 'feed_lang', title: 'feed_lang' },
        { id: 'default_start_date', title: 'default_start_date' },
        { id: 'default_end_date', title: 'default_end_date' },
        { id: 'feed_version', title: 'feed_version' },
        { id: 'feed_contact_email', title: 'feed_contact_email' },
        { id: 'feed_contact_url', title: 'feed_contact_url' }
      ]
    });

    const feedInfo = {
      feed_publisher_name: gtfsData.agency.agency_name,
      feed_publisher_url: gtfsData.agency.agency_url,
      feed_lang: gtfsData.agency.agency_lang || 'es',
      default_start_date: '20240101',
      default_end_date: '20241231',
      feed_version: `1.0-${new Date().toISOString().split('T')[0]}`,
      feed_contact_email: gtfsData.agency.agency_email || '',
      feed_contact_url: gtfsData.agency.agency_url || ''
    };

    await csvWriter.writeRecords([feedInfo]);
    return { path: filePath, type: 'feed_info' };
  }
}

module.exports = DataExporter;
