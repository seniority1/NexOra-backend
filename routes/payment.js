import express from "express";
import { verifyAndCreditCoins } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/verify", verifyAndCreditCoins);

export default router;
