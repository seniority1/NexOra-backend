import fs from "fs";
import path from "path";
import { exec } from "child_process";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

export const startBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ownerNumber, plan } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.coins < plan)
      return res.status(400).json({ success: false, message: "Not enough coins" });

    // Deduct coins
    user.coins -= plan;
    await user.save();

    // Expiry date by plan
    const expiry = new Date();
    if (plan === 500) expiry.setDate(expiry.getDate() + 7);
    if (plan === 1000) expiry.setDate(expiry.getDate() + 14);
    if (plan === 2000) expiry.setDate(expiry.getDate() + 30);

    const folderName = `bot_${userId}_${Date.now()}`;
    const botPath = path.join("bots", folderName);

    // Create folder
    fs.mkdirSync(botPath, { recursive: true });

    // Copy your bot template into the folder
    fs.copyFileSync("./template/index.js", `${botPath}/index.js`);

    // Save deployment record
    const deploy = await Deployment.create({
      user: userId,
      ownerNumber,
      plan,
      folderName,
      expiryDate: expiry,
      status: "running",
    });

    // Start PM2 process
    exec(`pm2 start ${botPath}/index.js --name ${folderName}`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Failed to start bot" });
      }

      return res.json({
        success: true,
        message: "Bot started successfully",
        deployment: deploy,
      });
    });

  } catch (err) {
    console.error("Start bot error:", err);
    res.status(500).json({ success: false, message: "Server error starting bot" });
  }
};
