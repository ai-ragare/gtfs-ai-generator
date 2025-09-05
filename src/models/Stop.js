const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stop_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  stop_code: {
    type: String,
    trim: true
  },
  stop_name: {
    type: String,
    required: true,
    trim: true
  },
  stop_desc: {
    type: String,
    trim: true
  },
  stop_lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  stop_lon: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  zone_id: {
    type: String,
    trim: true
  },
  stop_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'La URL debe ser válida'
    }
  },
  location_type: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  parent_station: {
    type: String,
    trim: true
  },
  stop_timezone: {
    type: String,
    default: 'America/Mexico_City'
  },
  wheelchair_boarding: {
    type: Number,
    default: 0,
    min: 0,
    max: 2
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

stopSchema.index({ stop_id: 1 });
stopSchema.index({ stop_code: 1 });
stopSchema.index({ location_type: 1 });
stopSchema.index({ stop_lat: 1, stop_lon: 1 });

module.exports = mongoose.model('Stop', stopSchema);
