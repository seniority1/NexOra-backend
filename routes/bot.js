// src/routes/bot.js

import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import { authMiddleware } from "../middleware/auth.js";  // ← Fixed: singular "middleware"

const router = express.Router();

// Protected route: only authenticated users can deploy a bot
router.post("/deploy", authMiddleware, deployBotToVPS);

export default router;
