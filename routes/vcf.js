import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models (Only if needed for other custom logic)
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

// ✅ Import the 'protect' middleware directly from your Auth Controller
// This matches your existing AuthController.js structure.
import { protect } from '../controllers/authController.js'; 

/**
 * 1. BOSS ROUTES (Command Center)
 * These routes are now PROTECTED. 
 * The 'protect' middleware ensures Seniority only sees Seniority's data.
 */

// Create a new session (Tied to the logged-in user via req.user.id)
router.post('/create', protect, vcfController.createSession);

// Fetch only the sessions created by the logged-in user
router.get('/active-sessions', protect, vcfController.getActiveSessions);

// View participant list (Access verified in controller using req.user.id)
router.get('/list/:sessionId', protect, vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES (Public)
 * These remain public so anyone can join the pool via the link.
 */

// Fetches title, status, and expiry for the join page
router.get('/session/:sessionId', vcfController.getSessionDetails);

// Participant joins the pool
router.post('/join', vcfController.joinSession);

// Save Push Subscription
router.post('/subscribe', vcfController.subscribeToNotifications);


/**
 * 3. SECURE DOWNLOAD ROUTE
 */
// Verified against the participant list within the controller logic
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
