// src/controllers/botDeployController.js
import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000/deploy";  // ← VPS bot factory endpoint
const SECRET_KEY = "NexOraEmpire2025King";                // ← Keep private

export const deployBotToVPS = async (req, res) => {
  try {
    const { userId, phoneNumber, days = 30 } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or phoneNumber",
      });
    }

    // Normalize phone (remove symbols, convert leading 0 → 234)
    const cleanPhone = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "234" + cleanPhone.slice(1)
      : cleanPhone;

    // 1. Deduct coins
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cost logic
    const costTable = { 7: 500, 14: 1000, 21: 1500, 30: 2000 };
    const cost = costTable[days] || 2000;

    if (user.coins < cost) {
      return res.status(400).json({
        success: false,
        message: "Not enough coins",
      });
    }

    user.coins -= cost;
    await user.save();

    // 2. Call VPS factory
    const factoryResponse = await axios.post(
      FACTORY_URL,
      {
        userId: userId.toString(),
        phoneNumber: formattedPhone,
        days,
        secret: SECRET_KEY,
      },
      { timeout: 60000 }
    );

    if (!factoryResponse.data.success) {
      throw new Error(factoryResponse.data.message || "Factory rejected");
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // 3. Save deployment
    await Deployment.create({
      user: userId,
      phoneNumber: cleanPhone,
      days,
      pairingCode,
      status: pairingCode === "Already linked" ? "active" : "waiting_pairing",
      expiryDate: new Date(Date.now() + days * 86400000),
    });

    // 4. Success output
    return res.json({
      success: true,
      pairingCode,
      message:
        pairingCode === "Already linked"
          ? `Bot already active for ${days} days`
          : `Bot ready! Use this pairing code in WhatsApp → Linked Devices → Add Device\n\nValid for ${days} days.`,
    });
  } catch (error) {
    console.error("Deploy Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Factory offline or busy. Try again in 20 seconds.",
    });
  }
};
