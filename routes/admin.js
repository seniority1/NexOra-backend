import express from "express";
import { 
  adminLogin, 
  getAllUsers, 
  addCoins, 
  getGiftedUsers, 
  banUser, 
  unbanUser, 
  getSecurityLogs, 
  sendBroadcast,
  getAllNotifications // 🚀 Added this to support the History list
} from "../controllers/adminController.js";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

// --- 🔐 Authentication ---
// Admin Login
router.post("/login", adminLogin);

// Verify admin session
router.get("/me", verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// --- 👥 User Management ---
// Fetch all users
router.get("/users", verifyAdmin, getAllUsers);

// Ban/Unban logic
router.post("/ban", verifyAdmin, banUser);
router.post("/unban", verifyAdmin, unbanUser);

// --- 💰 Economy ---
// Add coins to a user
router.post("/add-coins", verifyAdmin, addCoins);

// View users who received gifts/referrals
router.get("/gifted", verifyAdmin, getGiftedUsers);

// --- 🛡️ Security ---
// View system logs
router.get("/security", verifyAdmin, getSecurityLogs);

// --- 🔔 Notification System ---
// 📜 Fetch history for the Admin Panel list
router.get("/notifications", verifyAdmin, getAllNotifications);

// 📢 Send Global Broadcast or Private Message
router.post("/broadcast", verifyAdmin, sendBroadcast);

export default router;
