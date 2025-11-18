import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";

const execAsync = util.promisify(exec);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const startBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ownerNumber, plan } = req.body;

    if (!ownerNumber || !plan)
      return res.status(400).json({ success: false, message: "ownerNumber and plan required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if ((user.coins || 0) < plan)
      return res.status(400).json({ success: false, message: "Not enough coins" });

    // Deduct coins
    user.coins -= plan;
    await user.save();

    // Compute expiry
    const expiry = new Date();
    if (plan === 500) expiry.setDate(expiry.getDate() + 7);
    else if (plan === 1000) expiry.setDate(expiry.getDate() + 14);
    else if (plan === 1500) expiry.setDate(expiry.getDate() + 21);
    else if (plan === 2000) expiry.setDate(expiry.getDate() + 35);
    else expiry.setDate(expiry.getDate() + 7);

    // Create unique folder for bot
    const folderName = `bot_${userId}_${Date.now()}`;
    const botPath = path.resolve(process.cwd(), "bots", folderName);
    fs.mkdirSync(botPath, { recursive: true });

    // Clone repository
    await execAsync(`git clone https://github.com/seniority1/NexOra.git "${botPath}"`);

    // Install dependencies
    await execAsync(`npm install`, { cwd: botPath });

    // Write .env
    const envContent = `WHATSAPP_NUMBER=${ownerNumber}\nUSER_ID=${userId}`;
    fs.writeFileSync(path.join(botPath, ".env"), envContent);

    // Start PM2
    const pm2Name = folderName;
    try {
      await execAsync(`pm2 start index.js --name ${pm2Name} --cwd "${botPath}" --update-env`);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to start bot with PM2",
        error: err.message
      });
    }

    // Save deployment record
    const deployment = await Deployment.create({
      user: userId,
      ownerNumber,
      plan,
      status: "starting",
      folderName,
      expiryDate: expiry,
    });

    // Poll for pairing.json file
    const pairingFile = path.join(botPath, "pairing.json");
    const timeout = 60 * 1000;
    const startTime = Date.now();
    let pairing = null;

    while (Date.now() - startTime < timeout) {
      if (fs.existsSync(pairingFile)) {
        try {
          pairing = JSON.parse(fs.readFileSync(pairingFile, "utf8"));
          break;
        } catch {}
      }
      await sleep(1000);
    }

    if (pairing) {
      deployment.status = "waiting_for_pairing";
      await deployment.save();
      return res.json({
        success: true,
        message: "Bot started, pairing code ready",
        pairing,
        deployment,
      });
    } else {
      deployment.status = "started_no_pairing";
      await deployment.save();
      return res.status(502).json({
        success: false,
        message: "Bot started but no pairing code found",
        deployment,
      });
    }
  } catch (err) {
    console.error("Deploy error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
