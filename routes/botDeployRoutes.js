import express from "express";
import { 
  deployBotToVPS, 
  getUserDeployments, 
  stopBot, 
  restartBot, 
  deleteBot,
  // ADD THESE TWO NEW FUNCTIONS BELOW
  updateBotCode,
  updateBotStatus
} from "../controllers/botDeployController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/bot/user-bots
 */
router.get("/user-bots", authMiddleware, getUserDeployments);

/**
 * @route   POST /api/bot/deploy
 */
router.post("/deploy", authMiddleware, deployBotToVPS);

/**
 * @route   POST /api/bot/stop
 */
router.post("/stop", authMiddleware, stopBot);

/**
 * @route   POST /api/bot/restart
 */
router.post("/restart", authMiddleware, restartBot);

/**
 * @route   POST /api/bot/delete
 */
router.post("/delete", authMiddleware, deleteBot);

// --- 🛡️ VPS WEBHOOK ROUTES (NO AUTH MIDDLEWARE) ---

/**
 * @route   POST /api/bot/update-code
 * @desc    Receives pairing code from VPS bot instance
 */
router.post("/update-code", updateBotCode);

/**
 * @route   POST /api/bot/update-status
 * @desc    Receives online/offline status from VPS bot instance
 */
router.post("/update-status", updateBotStatus);

export default router;
