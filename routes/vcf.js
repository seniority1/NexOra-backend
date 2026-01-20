import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models (Optional here if all logic moves to controller)
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

/**
 * 1. BOSS ROUTES (Command Center)
 * Note: In a production environment, you should add your auth middleware 
 * (e.g., protectBoss) to these routes.
 */

// Create a new session
router.post('/create', vcfController.createSession);

// Get all active sessions (Used by Dashboard)
router.get('/active-sessions', async (req, res) => {
    try {
        // If you have auth middleware, filter by creator: req.user.id
        const active = await Session.find({ status: 'active' });
        res.json(active);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// View participant list for a specific session
// This now points to the controller which has the Boss-Check logic
router.get('/list/:sessionId', vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES (Join Page)
 */

// Fetches session title, status, and expiry for the Join Page UI
router.get('/session/:sessionId', vcfController.getSessionDetails);

// Participant joins the pool
router.post('/join', vcfController.joinSession);

/**
 * 3. SECURE DOWNLOAD ROUTE
 * The controller now expects ?phone=... in the URL.
 * Example: /api/vcf/download/abcd123?phone=+234...
 */
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
