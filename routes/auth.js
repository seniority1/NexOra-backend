import express from "express";
import {
  register,
  verifyCode,
  resendVerificationCode,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  deleteAccount,
  protect,
} from "../controllers/authController.js";

const router = express.Router();

// 🪄 Register a new user
router.post("/register", register);

// ✅ Verify user with code
router.post("/verify", verifyCode);

// 🔁 Resend verification code
router.post("/resend", resendVerificationCode);

// 🔐 Login user
router.post("/login", login);

// 🔑 Forgot password (send reset code)
router.post("/forgot-password", forgotPassword);

// 🔄 Reset password (verify code and update)
router.post("/reset-password", resetPassword);

// 🧑‍💼 Get user profile
router.get("/profile", protect, getProfile);

// 🧨 Danger Zone — Delete user account
router.delete("/delete-account", protect, deleteAccount);

export default router;
