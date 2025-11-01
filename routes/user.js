import express from "express";
import { getUserInfo, updateCoins, addDeployment } from "../controllers/userController.js";

const router = express.Router();

// 🧠 Get user info
router.get("/info", getUserInfo);

// 💰 Update coins
router.post("/updateCoins", updateCoins);

// 🚀 Add a new deployment
router.post("/addDeployment", addDeployment);

export default router;
