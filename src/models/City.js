const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  city_id: {
    type: String,
    unique: true,
    trim: true
  },
  city_name: {
    type: String,
    required: true,
    trim: true
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
  country: {
    type: String,
    default: 'México'
  },
  timezone: {
    type: String,
    default: 'America/Mexico_City'
  },
  language: {
    type: String,
    default: 'es',
    maxlength: 2
  },
  // Parámetros de generación
  generation_parameters: {
    transport_types: [{
      type: String,
      enum: ['bus', 'subway', 'tram', 'ferry', 'cable_tram', 'aerial_lift', 'funicular', 'trolleybus', 'monorail']
    }],
    number_of_routes: {
      type: Number,
      min: 1,
      max: 100
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
    }
  },
  // Estadísticas de la ciudad generada
  statistics: {
    total_routes: {
      type: Number,
      default: 0
    },
    total_stops: {
      type: Number,
      default: 0
    },
    total_trips: {
      type: Number,
      default: 0
    },
    coverage_area_km2: {
      type: Number,
      default: 0
    }
  },
  // Estado de generación
  generation_status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  generation_progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  generation_log: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String,
    level: {
      type: String,
      enum: ['info', 'warn', 'error']
    }
  }],
  // Metadatos
  created_by: {
    type: String,
    default: 'system'
  },
  ai_generated: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
citySchema.index({ city_name: 1 });
citySchema.index({ city_size: 1 });
citySchema.index({ city_type: 1 });
citySchema.index({ generation_status: 1 });
citySchema.index({ created_at: -1 });

// Virtual para obtener el número de agencias
citySchema.virtual('agencies_count', {
  ref: 'Agency',
  localField: 'city_id',
  foreignField: 'city_id',
  count: true
});

// Virtual para obtener el número de rutas
citySchema.virtual('routes_count', {
  ref: 'Route',
  localField: 'city_id',
  foreignField: 'city_id',
  count: true
});

// Middleware pre-save
citySchema.pre('save', function(next) {
  if (this.isNew && !this.city_id) {
    this.city_id = `city_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Método para actualizar progreso
citySchema.methods.updateProgress = function(progress, message, level = 'info') {
  this.generation_progress = progress;
  this.generation_log.push({
    timestamp: new Date(),
    message,
    level
  });
  
  if (progress === 100) {
    this.generation_status = 'completed';
  } else if (progress > 0) {
    this.generation_status = 'in_progress';
  }
  
  return this.save();
};

// Método para marcar como fallido
citySchema.methods.markAsFailed = function(errorMessage) {
  this.generation_status = 'failed';
  this.generation_log.push({
    timestamp: new Date(),
    message: errorMessage,
    level: 'error'
  });
  return this.save();
};

module.exports = mongoose.model('City', citySchema);
