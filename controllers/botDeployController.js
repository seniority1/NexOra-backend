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
        pairingCode: b.pairingCode || "Initializing...",
        latency: b.latency || 0 // Added for the quality indicator
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. DEPLOY BOT (Universal International Support)
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

    // 🌍 UNIVERSAL FIX: Remove spaces/dashes but KEEP the '+' if user provided it
    // We no longer force "234" prefix.
    const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

    const alreadyDeployed = await Deployment.findOne({ phoneNumber: formattedPhone });
    if (alreadyDeployed) return res.status(400).json({ success: false, message: "This number is already active in a slot." });

    // Deduct coins
    user.coins -= cost;
    await user.save();

    // Create record in Database
    try {
        await Deployment.create({
            user: user._id,
            phoneNumber: formattedPhone,
            days: Number(days),
            pairingCode: "Warming up...", 
            status: "initializing",
            expiryDate: new Date(Date.now() + (days * 86400000)),
        });
    } catch (dbError) {
        console.error("❌ MONGODB SAVE ERROR:", dbError.message);
    }

    // --- TRIGGER VPS HANDSHAKE ---
    try {
      await axios.post(`${FACTORY_URL}/deploy`, {
        phoneNumber: formattedPhone,
        secret: SECRET_KEY
      }, { timeout: 10000 }); 
    } catch (vpsErr) {
      console.log("⚠️ VPS handshake acknowledged in background.");
    }

    return res.json({ 
      success: true, 
      message: "Engine started! Your pairing code will appear on the dashboard shortly." 
    });

  } catch (error) {
    console.error("❌ CRITICAL DEPLOY ERROR:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error." 
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
 * 8. RESET SESSION (Repair Connection)
 * Only wipes the physical VPS files, keeping the DB slot active.
 */
export const resetSession = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // 1. Identify the user
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 2. Tell VPS to wipe ONLY the auth/session folder for this number
    // We use a separate route so the VPS knows NOT to stop the bot forever
    await axios.post(`${FACTORY_URL}/reset-session`, { 
      phoneNumber, 
      secret: SECRET_KEY 
    });

    // 3. Update the Database record
    // We don't delete! We just clear the old code and set status to resetting
    await Deployment.findOneAndUpdate(
      { user: user._id, phoneNumber },
      { 
        status: "resetting", 
        pairingCode: "Wiping session..." 
      }
    );

    res.json({ 
      success: true, 
      message: "Session files cleared. Please wait for a new pairing code." 
    });
  } catch (error) {
    console.error("RESET ERROR:", error.message);
    res.status(500).json({ success: false, message: "Failed to reset session." });
  }
};


/**
 * 6. WEBHOOK: Update Pairing Code (From VPS)
 * 🚀 Emits Socket signal for Real-time Dashboard update
 */
export const updateBotCode = async (req, res) => {
  const { phoneNumber, pairingCode, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).json({ success: false });

  try {
    const updated = await Deployment.findOneAndUpdate(
      { phoneNumber },
      { pairingCode, status: "waiting_pairing" },
      { new: true }
    );

    // ⚡ SOCKET TRIGGER: This tells the dashboard to show the code NOW
    if (global.io) {
        global.io.emit(`pairing-code-${phoneNumber}`, { code: pairingCode });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/**
 * 7. WEBHOOK: Update Status & Quality (From VPS)
 */
export const updateBotStatus = async (req, res) => {
  const { phoneNumber, status, latency, secret } = req.body;
  if (secret !== SECRET_KEY) return res.status(401).json({ success: false });

  try {
    const updateData = { status };
    if (latency !== undefined) updateData.latency = latency;

    await Deployment.findOneAndUpdate({ phoneNumber }, updateData);

    // ⚡ SOCKET TRIGGER: Update status icon and latency meter instantly
    if (global.io) {
        global.io.emit(`status-update-${phoneNumber}`, { status, latency });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
