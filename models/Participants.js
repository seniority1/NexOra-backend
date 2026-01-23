import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
});

ParticipantSchema.index({ sessionId: 1 });

// ✅ Change module.exports to export default
export default mongoose.model('Participant', ParticipantSchema);

In the updated user model ?
