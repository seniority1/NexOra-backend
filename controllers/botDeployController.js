// src/controllers/botDeployController.js
import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000/deploy";  // ← ONLY CHANGE THIS IF YOU MOVE VPS
const SECRET_KEY = "NexOraEmpire2025King";               // ← Change once, never again

export const deployBotToVPS = async (req, res) => {
  try {
    const { userId } = req.body; // or req.user._id if using auth
    const { phoneNumber, days = 30 } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({ success: false, message: "Missing userId or phoneNumber" });
    }

    // 1. Deduct coins
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const cost = days === 7 ? 500 : days === 14 ? 1000 : days === 21 ? 1500 : 2000;
    if (user.coins < cost) return res.status(400).json({ success: false, message: "Not enough coins" });

    user.coins -= cost;
    await user.save();

    // 2. Call your immortal VPS factory
    const factoryResponse = await axios.post(
      FACTORY_URL,
      {
        userId: userId.toString(),
        phoneNumber: phoneNumber.replace(/[^\d]/g, "").replace(/^0/, "234"),
        days,
        secret: SECRET_KEY
      },
      { timeout: 60000 }
    );

    if (!factoryResponse.data.success) {
      throw new Error(factoryResponse.data.message || "Factory rejected");
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // 3. Save deployment + expiry date
    await Deployment.create({
      user: userId,
      phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
      days,
      pairingCode,
      status: pairingCode === "Already linked" ? "active" : "waiting_pairing",
      expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    });

    // 4. Return success
    return res.json({
      success: true,
      pairingCode,
      message: pairingCode === "Already linked" 
        ? `Bot already active for ${days} days!` 
        : `Bot ready! Enter this code in WhatsApp → Linked Devices → Link with phone number\n\nValid for ${days} days`,
    });

  } catch (error) {
    console.error("Deploy Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Factory busy or offline — try again in 20 seconds",
    });
  }
};
