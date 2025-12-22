import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000/deploy";
const SECRET_KEY = "NexOraEmpire2025King";

const COST_TABLE = { 7: 500, 14: 1000, 21: 1500, 30: 2000 };

/**
 * 1. FETCH ALL USER BOTS (To fill the 5 Slots)
 * This is called by the UI on page load
 */
export const getUserDeployments = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Find all bots belonging to this user
    const bots = await Deployment.find({ user: user._id });

    return res.json({
      success: true,
      bots: bots.map(b => ({
        phoneNumber: b.phoneNumber,
        status: b.status, // e.g., 'active', 'waiting_pairing'
        expiryDate: b.expiryDate,
        pairingCode: b.pairingCode
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. DEPLOY BOT (Slot Validation + VPS Call)
 */
export const deployBotToVPS = async (req, res) => {
  try {
    let { phoneNumber, days = 7 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Missing phoneNumber" });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // --- NEW: 5-SLOT LIMIT CHECK ---
    const currentDeployments = await Deployment.countDocuments({ user: user._id });
    if (currentDeployments >= 5) {
      return res.status(400).json({
        success: false,
        message: "Limit reached! You can only manage 5 bots per account."
      });
    }

    // Format phone number
    const raw = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = raw.startsWith("0") ? "234" + raw.slice(1) : raw;

    // --- NEW: DUPLICATE CHECK ---
    const alreadyDeployed = await Deployment.findOne({ user: user._id, phoneNumber: formattedPhone });
    if (alreadyDeployed) {
      return res.status(400).json({ success: false, message: "This number is already in one of your slots!" });
    }

    // Cost Check
    const cost = COST_TABLE[days] || 2000;
    if (user.coins < cost) {
      return res.status(400).json({ success: false, message: "Not enough coins" });
    }

    // Call Factory VPS
    const factoryResponse = await axios.post(
      FACTORY_URL,
      { phoneNumber: formattedPhone, secret: SECRET_KEY },
      { timeout: 60000 }
    );

    if (!factoryResponse.data.success) {
      return res.status(500).json({
        success: false,
        message: factoryResponse.data.message || "Factory rejected request",
      });
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // Deduct coins & Save
    user.coins -= cost;
    await user.save();

    await Deployment.create({
      user: user._id,
      phoneNumber: formattedPhone,
      days,
      pairingCode,
      folderName: formattedPhone,
      status: pairingCode === "Already linked" ? "active" : "waiting_pairing",
      expiryDate: new Date(Date.now() + days * 86400000),
    });

    return res.json({
      success: true,
      pairingCode,
      message: "Bot initialized in a new slot!"
    });

  } catch (error) {
    console.error("Deploy Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Factory offline or busy. Try again shortly.",
      error: error.message,
    });
  }
};
