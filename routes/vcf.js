import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models (Used for the dashboard-specific route below)
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

/**
 * 1. BOSS ROUTES (Command Center)
 * These manage the lifecycle and visibility of the pools.
 */

// Create a new session (Initializes the pool and the auto-end timer)
router.post('/create', vcfController.createSession);

// Get all active sessions (Used by Dashboard to show running pools)
router.get('/active-sessions', async (req, res) => {
    try {
        // Only fetch sessions that are currently 'active'
        const active = await Session.find({ status: 'active' }).sort({ createdAt: -1 });
        res.json(active);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// View participant list for a specific session (Requires Boss authorization in controller)
router.get('/list/:sessionId', vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES (Join Page Interface)
 */

// Fetches title, status, and expiry (Now returns 'expired' status if past 48h completion)
router.get('/session/:sessionId', vcfController.getSessionDetails);

// Participant joins the pool (Validates status and prevents duplicates)
router.post('/join', vcfController.joinSession);


/**
 * 3. SECURE DOWNLOAD ROUTE
 * Pointing to the updated controller that checks the 48-hour download window.
 * Access: /api/vcf/download/:sessionId?phone=+dialcodeNumber
 */
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
