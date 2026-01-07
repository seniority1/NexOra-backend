import express from "express";

// 1. Core Admin Logic
import { 
  adminLogin, 
  getAllUsers, 
  addCoins, 
  getGiftedUsers, 
  clearGiftLogs,      // 👈 ADDED: Logic to wipe the ledger
  banUser, 
  unbanUser, 
  getSecurityLogs,
  getAllDeployments,
  deleteDeployment,   
  deleteUserAccount   
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

// 🗑️ Delete a user account from MongoDB via its ID
router.delete("/users/:id", verifyAdmin, deleteUserAccount); 

// --- 🤖 Bot Management (Active Engines) ---
// 🚀 Fetches all active NexOra engines for the table
router.get("/deployments", verifyAdmin, getAllDeployments); 

// 🗑️ Deletes a specific engine from MongoDB via its ID
router.delete("/deployments/:id", verifyAdmin, deleteDeployment); 

// --- 💰 Economy ---
router.post("/add-coins", verifyAdmin, addCoins);
router.get("/gifted", verifyAdmin, getGiftedUsers);
router.delete("/gift-logs/clear", verifyAdmin, clearGiftLogs); // 👈 ADDED: Connects to your "Clear All" button

// --- 🛡️ Security ---
router.get("/security", verifyAdmin, getSecurityLogs);

// --- 🔔 Notification System ---
router.get("/notifications", verifyAdmin, getAllNotifications);
router.post("/broadcast", verifyAdmin, sendBroadcast);

export default router;
