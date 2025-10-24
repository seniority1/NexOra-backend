import express from "express";
import { register, verifyEmail } from "../controllers/authController.js";

const router = express.Router();

// 🪄 Register a new user
router.post("/register", register);

// ✅ Verify user email
router.get("/verify/:token", verifyEmail);

export default router;
