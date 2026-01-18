const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true }, // Links to the session
    name: { type: String, required: true },
    phone: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
});

// Optimization: Indexing sessionId makes fetching 1000+ contacts very fast
ParticipantSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Participant', ParticipantSchema);
