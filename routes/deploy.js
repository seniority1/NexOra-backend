// routes/bot.js   ← FINAL WORKING VERSION
import express from "express";
import auth from "../middleware/auth.js";
import { deployBotToVPS } from "../controllers/botDeployController.js";  // ← CORRECT NAME

const router = express.Router();

// THIS IS THE ONLY ROUTE YOU NEED FOR PHASE 1
router.post("/deploy", auth, deployBotToVPS);
// ← You can delete or comment out the old "/start" route

export default router;
