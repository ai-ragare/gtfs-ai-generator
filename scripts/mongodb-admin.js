// Script de administración de MongoDB
// Ejecutar con: node scripts/mongodb-admin.js [comando]

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://admin:password123@localhost:27017/gtfs_generator?authSource=admin';

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function clearDatabase(client) {
  try {
    const db = client.db('gtfs_generator');
    const collections = ['cities', 'agencies', 'routes', 'stops', 'generation_requests'];
    
    console.log('🗑️ Limpiando base de datos...');
    
    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({});
        console.log(`  ✅ ${collectionName}: ${result.deletedCount} documentos eliminados`);
      } catch (error) {
        console.log(`  ⚠️ ${collectionName}: No existe o error al limpiar`);
      }
    }
    
    console.log('✅ Base de datos limpiada');
  } catch (error) {
    console.error('Error limpiando base de datos:', error);
  }
}

async function backupDatabase(client) {
  try {
    const db = client.db('gtfs_generator');
    const collections = ['cities', 'agencies', 'routes', 'stops', 'generation_requests'];
    const backup = {};
    
    console.log('💾 Creando backup...');
    
    for (const collectionName of collections) {
      try {
        const data = await db.collection(collectionName).find({}).toArray();
        backup[collectionName] = data;
        console.log(`  ✅ ${collectionName}: ${data.length} documentos`);
      } catch (error) {
        console.log(`  ⚠️ ${collectionName}: No existe`);
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(process.cwd(), 'backups', `backup-${timestamp}.json`);
    
    // Crear directorio de backups si no existe
    const backupDir = path.dirname(backupFile);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup guardado en: ${backupFile}`);
  } catch (error) {
    console.error('Error creando backup:', error);
  }
}

async function showIndexes(client) {
  try {
    const db = client.db('gtfs_generator');
    const collections = ['cities', 'agencies', 'routes', 'stops', 'generation_requests'];
    
    console.log('📇 Índices de la base de datos:');
    
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        console.log(`\n  ${collectionName}:`);
        indexes.forEach(index => {
          console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (error) {
        console.log(`  ${collectionName}: No existe`);
      }
    }
  } catch (error) {
    console.error('Error obteniendo índices:', error);
  }
}

async function optimizeDatabase(client) {
  try {
    const db = client.db('gtfs_generator');
    
    console.log('⚡ Optimizando base de datos...');
    
    // Crear índices si no existen
    const indexes = {
      cities: [
        { city_name: 1 },
        { generation_status: 1 },
        { created_at: -1 }
      ],
      agencies: [
        { agency_name: 1 },
        { city_id: 1 }
      ],
      routes: [
        { route_id: 1 },
        { city_id: 1 },
        { route_type: 1 }
      ],
      stops: [
        { stop_id: 1 },
        { city_id: 1 },
        { location_type: 1 }
      ],
      generation_requests: [
        { request_id: 1 },
        { city_id: 1 },
        { status: 1 },
        { created_at: -1 }
      ]
    };
    
    for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
      try {
        for (const index of collectionIndexes) {
          await db.collection(collectionName).createIndex(index);
          console.log(`  ✅ ${collectionName}: Índice creado ${JSON.stringify(index)}`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${collectionName}: Error creando índices`);
      }
    }
    
    console.log('✅ Base de datos optimizada');
  } catch (error) {
    console.error('Error optimizando base de datos:', error);
  }
}

async function main() {
  const command = process.argv[2];
  const client = await connectToMongoDB();
  
  try {
    switch (command) {
      case 'clear':
        await clearDatabase(client);
        break;
      case 'backup':
        await backupDatabase(client);
        break;
      case 'indexes':
        await showIndexes(client);
        break;
      case 'optimize':
        await optimizeDatabase(client);
        break;
      default:
        console.log('Comandos disponibles:');
        console.log('  clear    - Limpiar base de datos');
        console.log('  backup   - Crear backup');
        console.log('  indexes  - Mostrar índices');
        console.log('  optimize - Optimizar base de datos');
        break;
    }
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
  clearDatabase,
  backupDatabase,
  showIndexes,
  optimizeDatabase
};
