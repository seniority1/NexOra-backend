import express from "express";
import { protect } from "../controllers/authController.js";
import { getReferralDashboard } from "../controllers/referralController.js";

const router = express.Router();

router.get("/dashboard", protect, getReferralDashboard);

export default router;
