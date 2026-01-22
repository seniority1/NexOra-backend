import express from 'express';
const router = express.Router();

// ✅ ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

// ✅ Import your Auth Middleware (Ensure the path is correct for your project)
// This is what makes req.user available so Seniority and Alphonsus stay separated.
import { protect } from '../middleware/authMiddleware.js'; 

/**
 * 1. BOSS ROUTES (Command Center)
 * These routes are PROTECTED so only the owner can manage their own pools.
 */

// Create a new session (Tied to the logged-in user)
router.post('/create', protect, vcfController.createSession);

// Fetch only the sessions created by the logged-in user
router.get('/active-sessions', protect, vcfController.getActiveSessions);

// View participant list (Only if the requester owns the session)
router.get('/list/:sessionId', protect, vcfController.viewLiveList);


/**
 * 2. PARTICIPANT ROUTES (Public)
 * These are public because anyone with the link needs to be able to join.
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
// Verified against the participant list within the controller
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
