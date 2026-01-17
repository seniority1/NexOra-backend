const mongoose = require('mongoose');

const GainerSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionName: { type: String, required: true },
    duration: { type: Number, required: true }, // in minutes
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    participants: [{
        name: String,
        phone: String,
        countryCode: String,
        pushSubscription: Object // For the Chrome Notifications
    }],
    vcfUrl: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GainerSession', GainerSessionSchema);
                  
