import express from "express";
import { register, verifyCode } from "../controllers/authController.js";

const router = express.Router();

// 🪄 Register a new user
router.post("/register", register);

// ✅ Verify user with code
router.post("/verify-code", verifyCode);

export default router;
