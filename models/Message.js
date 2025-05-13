const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    ref: 'User'
  },
  room: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  plaintext: {
    type: String,
    required: true
  },
  encrypted: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);
