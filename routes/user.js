import express from "express";
import {
  getUserInfo,
  updateCoins,
  addDeployment,
  getTransactions,
} from "../controllers/userController.js";

const router = express.Router();

// 🧠 Get user info
router.get("/info", getUserInfo);

// 💰 Update coin balance + log transaction
router.post("/updateCoins", updateCoins);

// 📜 Get transaction history
router.get("/transactions", getTransactions);

// 🚀 Add a new deployment
router.post("/addDeployment", addDeployment);

export default router;
