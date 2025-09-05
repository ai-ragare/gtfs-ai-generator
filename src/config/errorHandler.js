const logger = require('./logger');

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  logger.error(`Error ${err.name}: ${err.message}`);
  logger.error(err.stack);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: `Error de validación: ${message}`,
      statusCode: 400
    };
  }

  // Error de duplicado de Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = {
      message: `El valor '${value}' para el campo '${field}' ya existe`,
      statusCode: 400
    };
  }

  // Error de cast de Mongoose
  if (err.name === 'CastError') {
    error = {
      message: `ID inválido: ${err.value}`,
      statusCode: 400
    };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token inválido',
      statusCode: 401
    };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expirado',
      statusCode: 401
    };
  }

  // Error de OpenAI
  if (err.name === 'OpenAIError') {
    error = {
      message: `Error de OpenAI: ${err.message}`,
      statusCode: 500
    };
  }

  // Error de límite de archivo
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'El archivo es demasiado grande',
      statusCode: 413
    };
  }

  // Error de límite de requests
  if (err.status === 429) {
    error = {
      message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
      statusCode: 429
    };
  }

  // Respuesta de error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
