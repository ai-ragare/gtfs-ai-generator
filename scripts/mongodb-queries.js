// Script de consultas útiles para MongoDB
// Ejecutar con: node scripts/mongodb-queries.js

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://admin:password123@localhost:27017/gtfs_generator?authSource=admin';

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    return client;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function showCollections(client) {
  try {
    const db = client.db('gtfs_generator');
    const collections = await db.listCollections().toArray();
    
    console.log('\n📋 Colecciones disponibles:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    return collections;
  } catch (error) {
    console.error('Error listando colecciones:', error);
  }
}

async function showStats(client) {
  try {
    const db = client.db('gtfs_generator');
    
    console.log('\n📊 Estadísticas de la base de datos:');
    
    // Contar documentos en cada colección
    const collections = ['cities', 'agencies', 'routes', 'stops', 'generation_requests'];
    
    for (const collectionName of collections) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`  ${collectionName}: ${count} documentos`);
      } catch (error) {
        console.log(`  ${collectionName}: No existe`);
      }
    }
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
  }
}

async function showRecentCities(client) {
  try {
    const db = client.db('gtfs_generator');
    const cities = await db.collection('cities')
      .find({})
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();
    
    console.log('\n🏙️ Ciudades recientes:');
    cities.forEach(city => {
      console.log(`  - ${city.city_name} (${city.city_size}) - ${city.generation_status}`);
    });
  } catch (error) {
    console.error('Error obteniendo ciudades:', error);
  }
}

async function showGenerationRequests(client) {
  try {
    const db = client.db('gtfs_generator');
    const requests = await db.collection('generation_requests')
      .find({})
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();
    
    console.log('\n🔄 Solicitudes de generación recientes:');
    requests.forEach(req => {
      console.log(`  - ${req.parameters.city_name} - ${req.status} - ${req.progress.percentage}%`);
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
  }
}

async function main() {
  const client = await connectToMongoDB();
  
  try {
    await showCollections(client);
    await showStats(client);
    await showRecentCities(client);
    await showGenerationRequests(client);
    
    console.log('\n🎉 Consultas completadas');
  } finally {
    await client.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  connectToMongoDB,
  showCollections,
  showStats,
  showRecentCities,
  showGenerationRequests
};
