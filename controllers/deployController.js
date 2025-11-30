// src/controllers/botDeployController.js
import axios from "axios";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const VPS_URL = "https://156.232.88.100:3001";  // your TrueHost VPS
const SECRET_KEY = "NexOraEmpire2025King";     // change this to anything secret

export const deployBotToVPS = async (req, res) => {
  try {
    const { userId } = req.body; // or req.user.id if using auth middleware
    const { phoneNumber, days } = req.body;

    // 1. Deduct coins (you already have this logic)
    const user = await User.findById(userId);
    const cost = days === 7 ? 500 : days === 14 ? 1000 : days === 21 ? 1500 : 2000;
    if (user.coins < cost) return res.status(400).json({ message: "Not enough coins" });

    user.coins -= cost;
    await user.save();

    // 2. Tell VPS to spawn the bot
    const vpsResponse = await axios.post(
      `${VPS_URL}/deploy`,
      {
        userId: userId.toString(),
        phoneNumber: phoneNumber.replace(/[^\d+]/g, ""),
        days,
        secret: SECRET_KEY
      },
      { timeout: 90000 } // 90 seconds max
    );

    if (!vpsResponse.data.success) throw new Error(vpsResponse.data.message);

    // 3. Save deployment record
    await Deployment.create({
      user: userId,
      phoneNumber,
      days,
      pairingCode: vpsResponse.data.code,
      status: "waiting_pairing",
      vpsFolder: vpsResponse.data.folder,
      expiryDate: new Date(Date.now() + days * 86400000)
    });

    return res.json({
      success: true,
      pairingCode: vpsResponse.data.codeFormatted,
      message: "Bot deploying… Type this code in WhatsApp"
    });

  } catch (error) {
    console.error("VPS Deploy Error:", error.message);
    return res.status(500).json({ success: false, message: "Bot factory busy, try again in 30s" });
  }
};
