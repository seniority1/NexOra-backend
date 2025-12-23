import express from "express";

// 1. Import Core User Logic
import { 
  getUserInfo, 
  updateCoins, 
  addDeployment,
  getTransactions 
} from "../controllers/userController.js";

// 2. Import Notification Logic 
// (Ensure the file in /controllers is exactly: usernotificationController.js)
import { 
  getUserNotifications, 
  markNotificationsRead 
} from "../controllers/usernotificationController.js"; 

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

// --- Notification Routes ---
// 🔔 Fetches both Global and Private notifications for the user
router.get("/notifications", getUserNotifications);

// ✅ Marks notifications as read when the user opens the bell dropdown
router.post("/notifications/mark-read", markNotificationsRead);

export default router;
