import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000"; 
const SECRET_KEY = "NexOraEmpire2025King";

// 💰 Your official pricing structure
const COST_TABLE = { 
  7: 500,   // 1 Week
  14: 1000, // 2 Weeks
  21: 1500, // 3 Weeks
  30: 2000  // 1 Month
};

/**
 * 1. FETCH ALL USER BOTS
 */
export const getUserDeployments = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bots = await Deployment.find({ user: user._id });

    return res.json({
      success: true,
      bots: bots.map(b => ({
        phoneNumber: b.phoneNumber,
        status: b.status,
        expiryDate: b.expiryDate,
        pairingCode: b.pairingCode
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. DEPLOY BOT
 */
export const deployBotToVPS = async (req, res) => {
  try {
    let { phoneNumber, days = 7 } = req.body;

    if (!phoneNumber) return res.status(400).json({ success: false, message: "Missing phoneNumber" });

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // --- 5-SLOT LIMIT CHECK ---
    const currentDeployments = await Deployment.countDocuments({ user: user._id });
    if (currentDeployments >= 5) {
      return res.status(400).json({ success: false, message: "Limit reached! You can only manage 5 bots." });
    }

    // --- PRICING VALIDATION ---
    const cost = COST_TABLE[days]; 
    if (cost === undefined) {
        return res.status(400).json({ success: false, message: "Invalid plan duration selected." });
    }

    if (user.coins < cost) {
        return res.status(400).json({ success: false, message: `Insufficient coins. This plan costs ${cost} coins.` });
    }

    // --- PHONE FORMATTING & DUPLICATE CHECK ---
    const raw = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = raw.startsWith("0") ? "234" + raw.slice(1) : raw;

    const alreadyDeployed = await Deployment.findOne({ user: user._id, phoneNumber: formattedPhone });
    if (alreadyDeployed) {
      return res.status(400).json({ success: false, message: "This number is already in one of your slots!" });
    }

    // --- CALL FACTORY VPS ---
    const factoryResponse = await axios.post(`${FACTORY_URL}/deploy`, {
      phoneNumber: formattedPhone,
      secret: SECRET_KEY
    }, { timeout: 60000 });

    if (!factoryResponse.data.success) {
      return res.status(500).json({ success: false, message: factoryResponse.data.message || "Factory error" });
    }

    const pairingCode = factoryResponse.data.pairingCode;

    // --- DEDUCT COINS & SAVE ---
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

    return res.json({ success: true, pairingCode, message: "Bot initialized!" });

  } catch (error) {
    console.error("Deploy Error:", error.message);
    return res.status(500).json({ success: false, message: "Factory offline. Try again later." });
  }
};

/**
 * 3. STOP BOT
 */
export const stopBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ email: req.user.email });

    await axios.post(`${FACTORY_URL}/stop`, { phoneNumber, secret: SECRET_KEY });

    await Deployment.findOneAndUpdate(
      { user: user._id, phoneNumber },
      { status: "stopped" }
    );

    res.json({ success: true, message: "Bot stopped" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to stop bot" });
  }
};

/**
 * 4. RESTART BOT
 */
export const restartBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    await axios.post(`${FACTORY_URL}/restart`, { phoneNumber, secret: SECRET_KEY });
    
    res.json({ success: true, message: "Restart signal sent" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to restart bot" });
  }
};

/**
 * 5. DELETE BOT
 */
export const deleteBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ email: req.user.email });

    await axios.post(`${FACTORY_URL}/delete`, { phoneNumber, secret: SECRET_KEY });

    await Deployment.findOneAndDelete({ user: user._id, phoneNumber });

    res.json({ success: true, message: "Slot cleared successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete bot" });
  }
};
