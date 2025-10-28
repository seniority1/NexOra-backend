import express from "express";
import {
  register,
  verifyCode,
  resendVerificationCode, // ✅ added new controller
} from "../controllers/authController.js";

const router = express.Router();

// 🪄 Register a new user
router.post("/register", register);

// ✅ Verify user with code
router.post("/verify-code", verifyCode);

// 🔁 Resend verification code
router.post("/resend-code", resendVerificationCode);

export default router;
