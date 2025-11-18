import express from "express";
import auth from "../middleware/auth.js";
import { startBot } from "../controllers/deployController.js";

const router = express.Router();

router.post("/start", auth, startBot);

export default router;
