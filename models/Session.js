import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    expiresAt: { type: Date, required: true },
    creator: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

// ✅ Change module.exports to export default
export default mongoose.model('Session', SessionSchema);
