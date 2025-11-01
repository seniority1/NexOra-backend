import express from "express";
import { getUserInfo, updateCoins, addDeployment } from "../controllers/userController.js";

const router = express.Router();

router.get("/info", getUserInfo);
router.post("/updateCoins", updateCoins);
router.post("/addDeployment", addDeployment);

export default router;
