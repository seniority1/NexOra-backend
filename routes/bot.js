import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";
import auth from "../middleware/auth.js"; // make sure path is correct

const router = express.Router();

// Apply JWT auth middleware
router.post("/deploy", auth, deployBotToVPS);

export default router;
