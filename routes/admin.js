import express from "express";
import { adminLogin, getAllUsers } from "../controllers/adminController.js";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

// Admin Login
router.post("/login", adminLogin);

// Verify admin session
router.get("/me", verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// ✅ NEW: Fetch all users (protected)
router.get("/users", verifyAdmin, getAllUsers);

export default router;
