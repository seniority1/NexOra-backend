import express from "express";

// 1. Core Admin Logic (From adminController.js)
import { 
  adminLogin, 
  getAllUsers, 
  addCoins, 
  getGiftedUsers, 
  banUser, 
  unbanUser, 
  getSecurityLogs 
} from "../controllers/adminController.js";

// 2. 🚀 Notification Logic (From the specialized adminNotifications.js)
// These names MUST match the exports in your controller exactly
import { 
  sendBroadcast, 
  getAllNotifications 
} from "../controllers/adminNotifications.js"; 

import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

// --- 🔐 Authentication ---
router.post("/login", adminLogin);

router.get("/me", verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// --- 👥 User Management ---
router.get("/users", verifyAdmin, getAllUsers);
router.post("/ban", verifyAdmin, banUser);
router.post("/unban", verifyAdmin, unbanUser);

// --- 💰 Economy ---
router.post("/add-coins", verifyAdmin, addCoins);
router.get("/gifted", verifyAdmin, getGiftedUsers);

// --- 🛡️ Security ---
router.get("/security", verifyAdmin, getSecurityLogs);

// --- 🔔 Notification System ---
// 📜 Matches the function name: getAllNotifications
router.get("/notifications", verifyAdmin, getAllNotifications);

// 📢 Matches the function name: sendBroadcast
router.post("/broadcast", verifyAdmin, sendBroadcast);

export default router;
