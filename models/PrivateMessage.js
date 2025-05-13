const mongoose = require('mongoose');

const PrivateMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    ref: 'User'
  },
  recipient: {
    type: String,
    required: true,
    ref: 'User'
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
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for efficient querying of conversations
PrivateMessageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model('PrivateMessage', PrivateMessageSchema);
