import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models (Only if needed for other custom logic)
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

/**
 * 1. BOSS ROUTES (Command Center)
 */

// Create a new session
router.post('/create', vcfController.createSession);

// 🔥 FIXED: Now points to the Controller function that calculates the live participant count
router.get('/active-sessions', vcfController.getActiveSessions);

// View participant list
router.get('/list/:sessionId', vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES
 */

// Fetches title, status, and expiry
router.get('/session/:sessionId', vcfController.getSessionDetails);

// Participant joins the pool
router.post('/join', vcfController.joinSession);

// Save Push Subscription
router.post('/subscribe', vcfController.subscribeToNotifications);


/**
 * 3. SECURE DOWNLOAD ROUTE
 */
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
