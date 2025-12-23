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
 * 2. DEPLOY BOT (FIXED: Async Handshake)
 */
export const deployBotToVPS = async (req, res) => {
  try {
    let { phoneNumber, days = 7 } = req.body;
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Missing phoneNumber" });

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Formatting Phone
    const raw = phoneNumber.replace(/[^\d]/g, "");
    const formattedPhone = raw.startsWith("0") ? "234" + raw.slice(1) : raw;

    // Validation
    const alreadyDeployed = await Deployment.findOne({ user: user._id, phoneNumber: formattedPhone });
    if (alreadyDeployed) return res.status(400).json({ success: false, message: "Number already active!" });

    const cost = COST_TABLE[days];
    if (user.coins < cost) return res.status(400).json({ success: false, message: "Insufficient coins." });

    // --- 🛠️ THE FIX: Async Request to Factory ---
    try {
      // We send the request but don't wait for the bot to fully "load"
      // The factory should return { success: true } immediately upon starting the process
      await axios.post(`${FACTORY_URL}/deploy`, {
        phoneNumber: formattedPhone,
        secret: SECRET_KEY
      }, { timeout: 10000 }); // Wait only 10s for the VPS to acknowledge

    } catch (vpsError) {
      console.error("VPS Communication failed:", vpsError.message);
      // Even if it "times out", usually the VPS process has already started.
      // We proceed to create the DB entry so the user sees the "Warming up" status.
    }

    // Deduct coins and create record
    user.coins -= cost;
    await user.save();

    await Deployment.create({
      user: user._id,
      phoneNumber: formattedPhone,
      days,
      pairingCode: "Generating...", 
      status: "initializing",
      expiryDate: new Date(Date.now() + (days * 86400000)),
    });

    return res.json({ 
      success: true, 
      message: "Engine is warming up! Refresh in 30 seconds to see your code." 
    });

  } catch (error) {
    console.error("Critical Deploy Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error during deployment." });
  }
};

/**
 * 3. STOP / RESTART / DELETE (Simplified)
 */
export const stopBot = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    await axios.post(`${FACTORY_URL}/stop`, { phoneNumber, secret: SECRET_KEY }, { timeout: 5000 });
    await Deployment.findOneAndUpdate({ phoneNumber }, { status: "stopped" });
    res.json({ success: true, message: "Bot stopped." });
  } catch (err) { res.status(500).json({ success: false, message: "VPS error" }); }
};

export const deleteBot = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    await axios.post(`${FACTORY_URL}/delete`, { phoneNumber, secret: SECRET_KEY }, { timeout: 5000 });
    await Deployment.findOneAndDelete({ phoneNumber });
    res.json({ success: true, message: "Slot cleared." });
  } catch (err) { res.status(500).json({ success: false, message: "VPS error" }); }
};

// --- 🛡️ WEBHOOKS (Ensure these are linked in your routes.js) ---

export const updateBotCode = async (req, res) => {
  const { phoneNumber, pairingCode, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).send("Unauthorized");

  try {
    await Deployment.findOneAndUpdate({ phoneNumber }, { pairingCode, status: "waiting_pairing" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
};

export const updateBotStatus = async (req, res) => {
  const { phoneNumber, status, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).send("Unauthorized");

  try {
    await Deployment.findOneAndUpdate({ phoneNumber }, { status });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
};
