import express from "express";
import { startBot } from "../controllers/deployController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/start", auth, startBot);

export default router;
