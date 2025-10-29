import {
  register,
  verifyCode,
  resendVerificationCode,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

router.post("/register", register);
router.post("/verify", verifyCode);
router.post("/resend", resendVerificationCode);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
