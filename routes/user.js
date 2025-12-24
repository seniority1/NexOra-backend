import express from "express";

// 1. Import Core User Logic
import { 
  getUserInfo, 
  updateCoins, 
  addDeployment,
  getTransactions,
  updatePreferences, // NEW
  getSessions,       // NEW
  logoutOthers       // NEW
} from "../controllers/userController.js";

// 2. Import Notification Logic 
// 🚀 UPDATED: Pointing to the new renamed file to fix the Render build error
import { 
  getUserNotifications, 
  markNotificationsRead 
} from "../controllers/notifController.js"; 

const router = express.Router();

// --- Core User Routes ---
// 🧠 Get profile data (Name, Coins, Deployments)
router.get("/info", getUserInfo);

// 💰 Manage coin balance and log transactions
router.post("/updateCoins", updateCoins);

// 🚀 Track new bot deployments
router.post("/addDeployment", addDeployment);

// 📜 Fetch the user's transaction history
router.get("/transactions", getTransactions);

// --- Settings & Session Routes ---
// ⚙️ Update notification toggles (Deployment, Broadcast, etc.)
router.post("/update-preferences", updatePreferences);

// 📱 Get list of devices currently logged in
router.get("/get-sessions", getSessions);

// 🚪 Terminate all sessions except the current one
router.post("/logout-others", logoutOthers);

// --- Notification Routes ---
// 🔔 Fetches both Global and Private notifications for the user
router.get("/notifications", getUserNotifications);

// ✅ Marks notifications as read when the user opens the bell dropdown
router.post("/notifications/mark-read", markNotificationsRead);

export default router;
