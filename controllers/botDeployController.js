// src/controllers/botDeployController.js
import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000/deploy";
const SECRET_KEY = "NexOraEmpire2025King";

// Cost table for different plans
const COST_TABLE = { 7: 500, 14: 1000, 21: 1500, 30: 2000 };

export const deployBotToVPS = async (req, res) => {
  try {
    const { userId, phoneNumber, days = 30 } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or phoneNumber",
      });
    }

    // Format phone number (replace 0-prefix with 234)
    const cleanPhone = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "234" + cleanPhone.slice(1)
      : cleanPhone;

    // 1️⃣ Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Check if user has enough coins
    const cost = COST_TABLE[days] || 2000;
    if (user.coins < cost) {
      return res.status(400).json({
        success: false,
        message: "Not enough coins",
      });
    }

    // 3️⃣ Call Factory (only send required info)
    const factoryResponse = await axios.post(
      FACTORY_URL,
      {
        phoneNumber: formattedPhone,
        days,
        secret: SECRET_KEY,
      },
      { timeout: 60000 }
    );

    // Handle factory errors
    if (!factoryResponse.data.success) {
      return res.status(500).json({
        success: false,
        message: factoryResponse.data.message || "Factory rejected request",
      });
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // 4️⃣ Deduct coins AFTER successful factory response
    user.coins -= cost;
    await user.save();

    // 5️⃣ Save deployment in DB
    await Deployment.create({
      user: userId,
      phoneNumber: formattedPhone,
      days,
      pairingCode,
      status: pairingCode === "Already linked" ? "active" : "waiting_pairing",
      expiryDate: new Date(Date.now() + days * 86400000),
    });

    // 6️⃣ Respond success to frontend
    return res.json({
      success: true,
      pairingCode,
      message:
        pairingCode === "Already linked"
          ? `Bot already active for ${days} days`
          : `Bot ready! Use this pairing code in WhatsApp → Linked Devices.\n\nValid for ${days} days.`,
    });
  } catch (error) {
    console.error("Deploy Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Factory offline or busy. Try again in 20 seconds.",
      error: error.message,
    });
  }
};
