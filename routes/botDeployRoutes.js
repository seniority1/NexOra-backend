import express from "express";
import { 
  deployBotToVPS, 
  getUserDeployments, 
  stopBot, 
  restartBot, 
  deleteBot,
  resetSession, // 🔥 ADDED: The repair logic function
  updateBotCode,
  updateBotStatus
} from "../controllers/botDeployController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/bot/user-bots
 * @desc    Fetch all bots belonging to the logged-in user
 */
router.get("/user-bots", authMiddleware, getUserDeployments);

/**
 * @route   POST /api/bot/deploy
 * @desc    Deduct coins and trigger VPS to start a new bot
 */
router.post("/deploy", authMiddleware, deployBotToVPS);

/**
 * @route   POST /api/bot/stop
 * @desc    Tell VPS to stop the bot process
 */
router.post("/stop", authMiddleware, stopBot);

/**
 * @route   POST /api/bot/restart
 * @desc    Tell VPS to restart the existing bot process
 */
router.post("/restart", authMiddleware, restartBot);

/**
 * @route   POST /api/bot/reset-session
 * @desc    🔥 NEW: Wipe VPS session files (Fixes Bad MAC) without deleting DB slot
 */
router.post("/reset-session", authMiddleware, resetSession);

/**
 * @route   POST /api/bot/delete
 * @desc    Full wipe: Kill VPS process, delete files, and remove DB record
 */
router.post("/delete", authMiddleware, deleteBot);

// --- 🛡️ VPS WEBHOOK ROUTES (NO AUTH MIDDLEWARE - PROTECTED BY SECRET KEY IN CONTROLLER) ---

/**
 * @route   POST /api/bot/update-code
 * @desc    Receives pairing code from VPS bot instance for dashboard display
 */
router.post("/update-code", updateBotCode);

/**
 * @route   POST /api/bot/update-status
 * @desc    Receives online/offline/latency status from VPS bot instance
 */
router.post("/update-status", updateBotStatus);

export default router;
