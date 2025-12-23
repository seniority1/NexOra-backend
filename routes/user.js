import express from "express";
import { 
  getUserInfo, 
  updateCoins, 
  addDeployment,
  getTransactions 
} from "../controllers/userController.js";

// 🛠️ FIX: Using lowercase 'u' to match the standard naming convention
import { 
  getUserNotifications, 
  markNotificationsRead 
} from "../controllers/usernotificationController.js";

const router = express.Router();

// 🧠 Get user info
router.get("/info", getUserInfo);

// 💰 Update coins
router.post("/updateCoins", updateCoins);

// 🚀 Add a new deployment
router.post("/addDeployment", addDeployment);

// 📜 Get transaction history
router.get("/transactions", getTransactions);

// 🔔 NOTIFICATIONS ROUTES
// This fetches global + private notifications for the bell icon
router.get("/notifications", getUserNotifications);

// This removes the red "unread" status when the user clicks the bell
router.post("/notifications/mark-read", markNotificationsRead);

export default router;
