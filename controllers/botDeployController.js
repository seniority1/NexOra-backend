// src/controllers/botDeployController.js
import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000/deploy";
const SECRET_KEY = "NexOraEmpire2025King";

const COST_TABLE = { 7: 500, 14: 1000, 21: 1500, 30: 2000 };

export const deployBotToVPS = async (req, res) => {
  try {
    const { phoneNumber, days = 30 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing phoneNumber",
      });
    }

    // Get logged-in user's email from JWT middleware
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "234" + cleanPhone.slice(1)
      : cleanPhone;

    // Cost check
    const cost = COST_TABLE[days] || 2000;

    if (user.coins < cost) {
      return res.status(400).json({
        success: false,
        message: "Not enough coins",
      });
    }

    // Call Factory VPS
    const factoryResponse = await axios.post(
      FACTORY_URL,
      {
        phoneNumber: formattedPhone,
        days,
        folderName: formattedPhone,
        plan: days,
        ownerNumber: formattedPhone,
        secret: SECRET_KEY,
      },
      { timeout: 60000 }
    );

    if (!factoryResponse.data.success) {
      return res.status(500).json({
        success: false,
        message: factoryResponse.data.message || "Factory rejected request",
      });
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // Deduct coins after success
    user.coins -= cost;
    await user.save();

    // Save deployment
    await Deployment.create({
      user: user._id,
      phoneNumber: formattedPhone,
      days,
      pairingCode,
      status: pairingCode === "Already linked" ? "active" : "waiting_pairing",
      expiryDate: new Date(Date.now() + days * 86400000),
    });

    return res.json({
      success: true,
      pairingCode,
      message:
        pairingCode === "Already linked"
          ? `Bot already active for ${days} days`
          : `Bot ready! Use this pairing code in WhatsApp → Linked Devices.\nValid for ${days} days.`,
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
