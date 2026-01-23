Import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'expired'], 
        default: 'active' 
    },
    expiresAt: { type: Date, required: true },
    // 🔥 Tracks when the pool moved from active to completed
    completedAt: { type: Date }, 
    creator: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },

    /* 🔔 NEW NOTIFICATION LOGIC 🔔 */
    // This stores everyone's browser "address" for this specific pool
    participants: [{
        phone: String,
        name: String,
        joinedAt: { type: Date, default: Date.now },
        // The encrypted push token from the browser
        pushSubscription: {
            endpoint: String,
            expirationTime: Number,
            keys: {
                p256dh: String,
                auth: String
            }
        }
    }]
});

// ✅ Exporting for use in the controller
export default mongoose.model('Session', SessionSchema);
