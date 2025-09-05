const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/gtfs_generator';
    
    const options = {
      maxPoolSize: 10, // Mantener hasta 10 conexiones de socket
      serverSelectionTimeoutMS: 5000, // Mantener intentando enviar operaciones por 5 segundos
      socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
    };

    const conn = await mongoose.connect(mongoURI, options);

    logger.info(`🗄️  MongoDB conectado: ${conn.connection.host}`);
    
    // Eventos de conexión
    mongoose.connection.on('error', (err) => {
      logger.error('Error de conexión a MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconectado');
    });

    // Manejo de cierre graceful
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexión a MongoDB cerrada por terminación de aplicación');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error al conectar con MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
