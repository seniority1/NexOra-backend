const express = require('express');
const router = express.Router();

// Correct path to your controller (controllers/vcfController.js)
const vcfController = require('../controllers/vcfController'); 

/**
 * 1. BOSS ROUTES (Command Center)
 */

// Initialize a new VCF pool session
router.post('/create', vcfController.createSession);

// Helper route to get all active sessions for the Dashboard Grid
router.get('/active-sessions', async (req, res) => {
    try {
        const Session = require('../models/Session');
        // Fetches sessions that are currently active
        const active = await Session.find({ status: 'active' });
        res.json(active);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fetch participant list for the Boss "View List" modal
router.get('/list/:sessionId', async (req, res) => {
    try {
        const Participant = require('../models/Participants'); // Matches your plural filename
        const list = await Participant.find({ sessionId: req.params.sessionId }).sort({ joinedAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


/**
 * 2. PARTICIPANT ROUTES (Join Page)
 */

// Logic for participants to join a specific VCF pool
router.post('/join', vcfController.joinSession);

// Download Route - Triggers the automatic VCF generation and download
router.get('/download/:sessionId', vcfController.downloadVcf);


module.exports = router;
