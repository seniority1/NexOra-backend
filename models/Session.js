const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    name: { type: String, required: true }, // e.g., "VIP Gainer"
    duration: { type: Number, required: true }, // in minutes
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    expiresAt: { type: Date, required: true },
    creator: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);
