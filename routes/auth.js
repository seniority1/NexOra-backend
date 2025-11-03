import express from "express";
import {
  register,
  verifyCode,
  resendVerificationCode,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 🧾 AUTH ROUTES
 */

// 🪄 Register a new user
router.post("/register", register);

// ✅ Verify user with code
router.post("/verify", verifyCode);

// 🔁 Resend verification code
router.post("/resend", resendVerificationCode);

// 🔐 Login user (returns user data)
router.post("/login", login);

// 🧠 Forgot password (send reset code)
router.post("/forgot-password", forgotPassword);

// 🔄 Reset password (verify code and update password)
router.post("/reset-password", resetPassword);

// 👤 Get user profile (protected)
router.get("/profile", protect, getProfile);

// ✏️ Update user profile (protected)
router.put("/profile", protect, updateProfile);

/**
 * 🚀 Export
 */
export default router;
