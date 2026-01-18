import express from 'express';
const router = express.Router();

// ✅ Correct ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models (Note the .js extension, required in ESM)
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

/**
 * 1. BOSS ROUTES (Command Center)
 */

// Initialize a new VCF pool session
router.post('/create', vcfController.createSession);

// Helper route to get all active sessions for the Dashboard Grid
router.get('/active-sessions', async (req, res) => {
    try {
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


// ✅ Correct ESM Export
export default router;
