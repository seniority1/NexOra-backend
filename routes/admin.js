import express from "express";

// 1. Core Admin Logic
import { 
  adminLogin, 
  getAllUsers, 
  addCoins, 
  getGiftedUsers, 
  banUser, 
  unbanUser, 
  getSecurityLogs,
  getAllDeployments // 👈 ADDED THIS
} from "../controllers/adminController.js";

// 2. 🚀 Notification Logic
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

// --- 🤖 Bot Management (Active Engines) ---
// 🚀 This is what updates the "0" to the real count on your dashboard
router.get("/deployments", verifyAdmin, getAllDeployments); 

// --- 💰 Economy ---
router.post("/add-coins", verifyAdmin, addCoins);
router.get("/gifted", verifyAdmin, getGiftedUsers);

// --- 🛡️ Security ---
router.get("/security", verifyAdmin, getSecurityLogs);

// --- 🔔 Notification System ---
router.get("/notifications", verifyAdmin, getAllNotifications);
router.post("/broadcast", verifyAdmin, sendBroadcast);

export default router;
