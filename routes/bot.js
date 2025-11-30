// routes/bot.js  ← CREATE THIS FILE
import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import auth from "../middleware/auth.js";  // or your auth middleware

const router = express.Router();

// THIS IS THE ONLY ROUTE FOR PHASE 1
router.post("/deploy", auth, deployBotToVPS);

export default router;
