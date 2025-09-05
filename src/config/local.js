// Configuración para desarrollo local
const path = require('path');

module.exports = {
  // Configuración de MongoDB para desarrollo local
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/gtfs_generator_dev',
    options: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Configuración de Ollama para desarrollo local
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS) || 4000
  },

  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'app.log')
  },

  // Configuración de GTFS
  gtfs: {
    outputDir: process.env.GTFS_OUTPUT_DIR || path.join(process.cwd(), 'generated-gtfs'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },

  // Configuración de rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};
