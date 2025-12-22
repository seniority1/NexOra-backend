import express from "express";
import { 
  deployBotToVPS, 
  getUserDeployments, 
  stopBot, 
  restartBot, 
  deleteBot 
} from "../controllers/botDeployController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/bot/user-bots
 * @desc    Fetch all 5 slots (active or empty) for the dashboard
 */
router.get("/user-bots", authMiddleware, getUserDeployments);

/**
 * @route   POST /api/bot/deploy
 * @desc    Initialize a new bot deployment
 */
router.post("/deploy", authMiddleware, deployBotToVPS);

/**
 * @route   POST /api/bot/stop
 * @desc    Stop a running bot instance
 */
router.post("/stop", authMiddleware, stopBot);

/**
 * @route   POST /api/bot/restart
 * @desc    Restart a bot instance
 */
router.post("/restart", authMiddleware, restartBot);

/**
 * @route   POST /api/bot/delete
 * @desc    Wipe bot session and free up the slot
 */
router.post("/delete", authMiddleware, deleteBot);

export default router;
