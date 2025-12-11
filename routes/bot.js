import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import { authMiddleware } from "../middlewares/auth.js"; // This line is correct

const router = express.Router();

// Protected route: only authenticated users can deploy a bot
router.post("/deploy", authMiddleware, deployBotToVPS);

export default router;
