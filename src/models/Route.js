const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  route_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  agency_id: {
    type: String,
    required: true,
    ref: 'Agency'
  },
  route_short_name: {
    type: String,
    trim: true
  },
  route_long_name: {
    type: String,
    required: true,
    trim: true
  },
  route_desc: {
    type: String,
    trim: true
  },
  route_type: {
    type: Number,
    required: true,
    min: 0,
    max: 12
  },
  route_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'La URL debe ser válida'
    }
  },
  route_color: {
    type: String,
    default: 'FFFFFF',
    validate: {
      validator: function(v) {
        return /^[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'El color debe ser un código hexadecimal de 6 dígitos'
    }
  },
  route_text_color: {
    type: String,
    default: '000000',
    validate: {
      validator: function(v) {
        return /^[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'El color del texto debe ser un código hexadecimal de 6 dígitos'
    }
  },
  // Campos adicionales
  city_id: {
    type: String,
    ref: 'City',
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
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
  timestamps: true
});

routeSchema.index({ route_id: 1 });
routeSchema.index({ agency_id: 1 });
routeSchema.index({ route_type: 1 });

module.exports = mongoose.model('Route', routeSchema);
