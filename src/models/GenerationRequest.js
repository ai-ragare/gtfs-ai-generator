const mongoose = require('mongoose');

const generationRequestSchema = new mongoose.Schema({
  request_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  city_id: {
    type: String,
    ref: 'City',
    required: true
  },
  // Parámetros de la solicitud
  parameters: {
    city_name: {
      type: String,
      required: true
    },
    city_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'mega'],
      required: true
    },
    city_type: {
      type: String,
      enum: ['tourist', 'industrial', 'residential', 'mixed'],
      default: 'mixed'
    },
    population_density: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    transport_types: [{
      type: String,
      enum: ['bus', 'subway', 'tram', 'ferry', 'cable_tram', 'aerial_lift', 'funicular', 'trolleybus', 'monorail']
    }],
    number_of_routes: {
      type: Number,
      min: 1,
      max: 100,
      default: 10
    },
    operating_hours: {
      start: {
        type: String,
        default: '05:00'
      },
      end: {
        type: String,
        default: '23:30'
      }
    },
    tourist_areas: {
      type: Boolean,
      default: false
    },
    industrial_zones: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'es'
    }
  },
  // Estado de la solicitud
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Progreso de generación
  progress: {
    current_step: {
      type: String,
      enum: ['planning', 'coordinates', 'routes', 'schedules', 'export', 'completed']
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    estimated_completion: Date
  },
  // Resultados
  results: {
    agencies_generated: {
      type: Number,
      default: 0
    },
    routes_generated: {
      type: Number,
      default: 0
    },
    stops_generated: {
      type: Number,
      default: 0
    },
    trips_generated: {
      type: Number,
      default: 0
    },
    stop_times_generated: {
      type: Number,
      default: 0
    },
    export_files: [{
      filename: String,
      file_path: String,
      file_size: Number,
      format: String
    }]
  },
  // Logs de la generación
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    step: String,
    message: String,
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug']
    },
    details: mongoose.Schema.Types.Mixed
  }],
  // Metadatos
  requested_by: {
    type: String,
    default: 'system'
  },
  processing_time_ms: {
    type: Number,
    default: 0
  },
  ai_model_used: {
    type: String,
    default: 'ollama-llama2'
  },
  // Errores
  error_details: {
    message: String,
    stack: String,
    step: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
generationRequestSchema.index({ request_id: 1 });
generationRequestSchema.index({ city_id: 1 });
generationRequestSchema.index({ status: 1 });
generationRequestSchema.index({ created_at: -1 });
generationRequestSchema.index({ 'parameters.city_name': 1 });

// Middleware pre-save
generationRequestSchema.pre('save', function(next) {
  if (this.isNew && !this.request_id) {
    this.request_id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Método para actualizar progreso
generationRequestSchema.methods.updateProgress = function(step, percentage, message, level = 'info') {
  this.progress.current_step = step;
  this.progress.percentage = percentage;
  
  this.logs.push({
    timestamp: new Date(),
    step,
    message,
    level
  });
  
  if (percentage === 100) {
    this.status = 'completed';
    this.progress.current_step = 'completed';
  } else if (percentage > 0) {
    this.status = 'processing';
  }
  
  return this.save();
};

// Método para añadir resultado
generationRequestSchema.methods.addResult = function(type, count) {
  const resultField = `${type}_generated`;
  if (this.results[resultField] !== undefined) {
    this.results[resultField] = count;
  }
  return this.save();
};

// Método para añadir archivo de exportación
generationRequestSchema.methods.addExportFile = function(filename, filePath, fileSize, format) {
  this.results.export_files.push({
    filename,
    file_path: filePath,
    file_size: fileSize,
    format
  });
  return this.save();
};

// Método para marcar como fallido
generationRequestSchema.methods.markAsFailed = function(error, step) {
  this.status = 'failed';
  this.error_details = {
    message: error.message,
    stack: error.stack,
    step
  };
  
  this.logs.push({
    timestamp: new Date(),
    step,
    message: error.message,
    level: 'error',
    details: error
  });
  
  return this.save();
};

// Método para calcular tiempo de procesamiento
generationRequestSchema.methods.calculateProcessingTime = function() {
  if (this.status === 'completed' || this.status === 'failed') {
    this.processing_time_ms = Date.now() - this.created_at.getTime();
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('GenerationRequest', generationRequestSchema);
