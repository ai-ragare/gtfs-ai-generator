const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  agency_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  agency_name: {
    type: String,
    required: true,
    trim: true
  },
  agency_url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'La URL debe ser válida (http:// o https://)'
    }
  },
  agency_timezone: {
    type: String,
    required: true,
    default: 'America/Mexico_City'
  },
  agency_lang: {
    type: String,
    default: 'es',
    maxlength: 2
  },
  agency_phone: {
    type: String,
    trim: true
  },
  agency_fare_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'La URL de tarifas debe ser válida (http:// o https://)'
    }
  },
  agency_email: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'El email debe ser válido'
    }
  },
  // Campos adicionales para la aplicación
  city_id: {
    type: String,
    ref: 'City',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'México'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: String,
    default: 'system'
  },
  ai_generated: {
    type: Boolean,
    default: true
  },
  generation_request_id: {
    type: String,
    ref: 'GenerationRequest'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
agencySchema.index({ agency_name: 1 });
agencySchema.index({ city: 1 });
agencySchema.index({ is_active: 1 });

// Virtual para obtener el número de rutas
agencySchema.virtual('routes_count', {
  ref: 'Route',
  localField: 'agency_id',
  foreignField: 'agency_id',
  count: true
});

// Middleware pre-save
agencySchema.pre('save', function(next) {
  if (this.isNew && !this.agency_id) {
    this.agency_id = `agency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

module.exports = mongoose.model('Agency', agencySchema);
