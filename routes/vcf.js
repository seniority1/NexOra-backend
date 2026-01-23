import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller logic
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Import the 'protect' middleware from your Auth Controller
// This ensures the session is tied to a specific User ID (the "Boss")
import { protect } from '../controllers/authController.js'; 

/**
 * 1. BOSS ROUTES (Command Center)
 * These routes require authentication. 
 * 'protect' adds the user object to req.user for the controller to use.
 */

// Create a new VCF pool (Nested into req.user.vcfSessions)
router.post('/create', protect, vcfController.createSession);

// Fetch the 5 most recent pools created by this specific user
router.get('/active-sessions', protect, vcfController.getActiveSessions);

// View the detailed participant list for a specific pool (Ownership verified)
router.get('/list/:sessionId', protect, vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES (Public)
 * These remain public so anyone with a link can join the pool.
 */

// Fetches pool details (name, status, count) for the join page
router.get('/session/:sessionId', vcfController.getSessionDetails);

// Participant joins the pool (Adds data to the Owner's sub-document)
router.post('/join', vcfController.joinSession);

// Save Web-Push Subscription for the participant
router.post('/subscribe', vcfController.subscribeToNotifications);


/**
 * 3. DOWNLOAD ROUTE
 * Publicly accessible but validated via phone number within the controller
 */
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
