import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Deploy WhatsApp bot (user must be logged in)
router.post("/deploy", authMiddleware, deployBotToVPS);

export default router;
