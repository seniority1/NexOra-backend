import express from "express";
import { 
  getUserInfo, 
  updateCoins, 
  addDeployment,
  getTransactions      // 👈 NEW import
} from "../controllers/userController.js";

const router = express.Router();

// 🧠 Get user info
router.get("/info", getUserInfo);

// 💰 Update coins
router.post("/updateCoins", updateCoins);

// 🚀 Add a new deployment
router.post("/addDeployment", addDeployment);

// 📜 NEW: Get transaction history
router.get("/transactions", getTransactions);   // 👈 Added route

export default router;
