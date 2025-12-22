import express from "express";
import { 
  deployBotToVPS, 
  getUserDeployments, // 👈 New: Get all bots for the 5 slots
} from "../controllers/botDeployController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// 1. Fetch all bots for the dashboard slots
// GET /api/bot/user-bots
router.get("/user-bots", authMiddleware, getUserDeployments);

// 2. Deploy a new bot to a slot
// POST /api/bot/deploy
router.post("/deploy", authMiddleware, deployBotToVPS);

/* 3. FUTURE: Add Stop/Restart/Delete here 
   router.post("/stop", authMiddleware, stopBotController);
   router.post("/delete", authMiddleware, deleteBotController);
*/

export default router;
