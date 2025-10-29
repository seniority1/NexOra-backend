import express from "express";
import {
  register,
  verifyCode,
  resendVerificationCode,
  login,
} from "../controllers/authController.js";

const router = express.Router();

// 🟢 Auth routes
router.post("/register", register);
router.post("/verify", verifyCode);
router.post("/resend", resendVerificationCode);
router.post("/login", login);

export default router;
