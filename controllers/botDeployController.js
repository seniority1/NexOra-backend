import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const FACTORY_URL = "http://156.232.88.100:8000"; 
const SECRET_KEY = "NexOraEmpire2025King";

const COST_TABLE = { 
  7: 500,   
  14: 1000, 
  21: 1500, 
  30: 2000  
};

/**
 * 1. FETCH ALL USER BOTS
 */
export const getUserDeployments = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bots = await Deployment.find({ user: user._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      bots: bots.map(b => ({
        phoneNumber: b.phoneNumber,
        status: b.status,
        expiryDate: b.expiryDate,
        pairingCode: b.pairingCode || "Initializing..."
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. DEPLOY BOT (Optimized Handshake)
 */
export const deployBotToVPS = async (req, res) => {
  try {
    let { phoneNumber, days = 7 } = req.body;
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Missing phoneNumber" });

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const currentDeployments = await Deployment.countDocuments({ user: user._id });
    if (currentDeployments >= 5) return res.status(400).json({ success: false, message: "Limit reached: 5 bots." });

    const cost = COST_TABLE[days];
    if (user.coins < cost) return res.status(400).json({ success: false, message: "Insufficient coins." });

    const raw = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = raw.startsWith("0") ? "234" + raw.slice(1) : raw;

    const alreadyDeployed = await Deployment.findOne({ user: user._id, phoneNumber: formattedPhone });
    if (alreadyDeployed) return res.status(400).json({ success: false, message: "Number already active." });

    // --- TRIGGER VPS ---
    // We wrap this in its own try/catch so a VPS timeout doesn't kill the whole request
    try {
      await axios.post(`${FACTORY_URL}/deploy`, {
        phoneNumber: formattedPhone,
        secret: SECRET_KEY
      }, { timeout: 10000 }); // Give it 10 seconds
    } catch (vpsErr) {
      console.log("⚠️ VPS handshake slow, but engine should be starting in background...");
    }

    // Deduct coins
    user.coins -= cost;
    await user.save();

    // Create record in Database
    await Deployment.create({
      user: user._id,
      phoneNumber: formattedPhone,
      days,
      pairingCode: "Warming up...", 
      status: "initializing",
      expiryDate: new Date(Date.now() + (days * 86400000)),
    });

    // We return SUCCESS because the DB record is made and coins are taken.
    // The Webhook from the VPS will update the pairing code later.
    return res.json({ 
      success: true, 
      message: "Engine started! Check your dashboard in 20 seconds for the code." 
    });

  } catch (error) {
    console.error("CRITICAL ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "An internal server error occurred. Please try again." 
    });
  }
};

/**
 * 3. STOP BOT
 */
export const stopBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ email: req.user.email });

    await axios.post(`${FACTORY_URL}/stop`, { phoneNumber, secret: SECRET_KEY }).catch(() => {});

    await Deployment.findOneAndUpdate(
      { user: user._id, phoneNumber },
      { status: "stopped", pairingCode: "" }
    );

    res.json({ success: true, message: "Bot stopped." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to stop bot." });
  }
};

/**
 * 4. RESTART BOT
 */
export const restartBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    await axios.post(`${FACTORY_URL}/deploy`, { phoneNumber, secret: SECRET_KEY }, { timeout: 8000 });
    
    await Deployment.findOneAndUpdate({ phoneNumber }, { status: "restarting" });
    
    res.json({ success: true, message: "Restart signal sent." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to restart." });
  }
};

/**
 * 5. DELETE BOT
 */
export const deleteBot = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ email: req.user.email });

    await axios.post(`${FACTORY_URL}/delete`, { phoneNumber, secret: SECRET_KEY }).catch(() => {});

    await Deployment.findOneAndDelete({ user: user._id, phoneNumber });

    res.json({ success: true, message: "Slot cleared." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete bot." });
  }
};

/**
 * 6. WEBHOOK: Update Pairing Code
 */
export const updateBotCode = async (req, res) => {
  const { phoneNumber, pairingCode, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).json({ success: false });

  try {
    await Deployment.findOneAndUpdate(
      { phoneNumber },
      { pairingCode, status: "waiting_pairing" }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/**
 * 7. WEBHOOK: Update Status
 */
export const updateBotStatus = async (req, res) => {
  const { phoneNumber, status, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).json({ success: false });

  try {
    await Deployment.findOneAndUpdate({ phoneNumber }, { status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
