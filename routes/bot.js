import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import { authMiddleware } from "../middlewares/auth.js"; // make sure you have this

const router = express.Router();

// Protected route: only authenticated users can deploy a bot
router.post("/deploy", authMiddleware, deployBotToVPS);

export default router;
