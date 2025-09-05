// Script de inicialización de MongoDB
// Este archivo se ejecuta automáticamente cuando se crea el contenedor de MongoDB

// Crear la base de datos
db = db.getSiblingDB('gtfs_generator');

// Crear colecciones principales
db.createCollection('agencies');
db.createCollection('routes');
db.createCollection('stops');
db.createCollection('trips');
db.createCollection('stop_times');
db.createCollection('calendar');
db.createCollection('calendar_dates');
db.createCollection('fare_attributes');
db.createCollection('fare_rules');
db.createCollection('shapes');
db.createCollection('frequencies');
db.createCollection('transfers');
db.createCollection('pathways');
db.createCollection('levels');
db.createCollection('feed_info');

// Crear colecciones para la aplicación
db.createCollection('generation_requests');
db.createCollection('ai_prompts');
db.createCollection('generation_logs');

// Crear índices para mejorar el rendimiento
db.agencies.createIndex({ "agency_id": 1 });
db.routes.createIndex({ "route_id": 1 });
db.routes.createIndex({ "agency_id": 1 });
db.stops.createIndex({ "stop_id": 1 });
db.stops.createIndex({ "stop_code": 1 });
db.trips.createIndex({ "trip_id": 1 });
db.trips.createIndex({ "route_id": 1 });
db.trips.createIndex({ "service_id": 1 });
db.stop_times.createIndex({ "trip_id": 1 });
db.stop_times.createIndex({ "stop_id": 1 });
db.calendar.createIndex({ "service_id": 1 });
db.calendar_dates.createIndex({ "service_id": 1 });
db.fare_attributes.createIndex({ "fare_id": 1 });
db.fare_rules.createIndex({ "fare_id": 1 });
db.shapes.createIndex({ "shape_id": 1 });
db.frequencies.createIndex({ "trip_id": 1 });
db.transfers.createIndex({ "from_stop_id": 1 });
db.transfers.createIndex({ "to_stop_id": 1 });
db.pathways.createIndex({ "pathway_id": 1 });
db.levels.createIndex({ "level_id": 1 });
db.feed_info.createIndex({ "feed_publisher_name": 1 });

// Crear índices para colecciones de la aplicación
db.generation_requests.createIndex({ "created_at": 1 });
db.generation_requests.createIndex({ "status": 1 });
db.ai_prompts.createIndex({ "created_at": 1 });
db.generation_logs.createIndex({ "request_id": 1 });
db.generation_logs.createIndex({ "created_at": 1 });

print('Base de datos GTFS inicializada correctamente');
