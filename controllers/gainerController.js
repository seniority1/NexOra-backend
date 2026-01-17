const GainerSession = require('../models/GainerSession');
const crypto = require('crypto');

exports.createSession = async (req, res) => {
    try {
        const { sessionName, duration } = req.body;
        const sessionId = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g., A1B2C3
        
        const expiresAt = new Date(Date.now() + duration * 60000);

        const session = new GainerSession({
            sessionId,
            creatorId: req.user._id, // Assuming you have auth middleware
            sessionName,
            duration,
            expiresAt
        });

        await session.save();
        res.status(201).json({ success: true, sessionId, expiresAt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.joinSession = async (req, res) => {
    try {
        const { sessionId, name, phone, countryCode, subscription } = req.body;
        
        const session = await GainerSession.findOne({ sessionId, status: 'active' });
        if (!session) return res.status(404).json({ message: "Session not found or expired" });

        session.participants.push({ name, phone, countryCode, pushSubscription: subscription });
        await session.save();

        res.json({ success: true, message: "Successfully joined the pool" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
          
