// controllers/deployController.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import Deployment from "../models/Deployment.js";
import User from "../models/User.js";
import util from "util";
const execAsync = util.promisify(exec);

// helper: copy directory recursively (node 18+ can use fs.cp with recursive:true)
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) throw new Error("Template folder missing: " + src);
  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(src, { withFileTypes: true });
  for (const item of items) {
    const s = path.join(src, item.name);
    const d = path.join(dest, item.name);
    if (item.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const startBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ownerNumber, plan } = req.body; // plan = coin cost e.g. 500,1000,...

    if (!ownerNumber || !plan) return res.status(400).json({ success:false, message:"ownerNumber and plan required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:"User not found" });

    if ((user.coins || 0) < plan) return res.status(400).json({ success:false, message:"Not enough coins" });

    // Deduct immediately (or you may choose to deduct only after payment confirmed)
    user.coins = (user.coins || 0) - plan;
    await user.save();

    // compute expiry based on plan (customize as needed)
    const expiry = new Date();
    if (plan === 500) expiry.setDate(expiry.getDate() + 7);
    else if (plan === 1000) expiry.setDate(expiry.getDate() + 14);
    else if (plan === 1500) expiry.setDate(expiry.getDate() + 21);
    else if (plan === 2000) expiry.setDate(expiry.getDate() + 35);
    else expiry.setDate(expiry.getDate() + 7); // fallback

    // create unique folder for bot
    const folderName = `bot_${userId}_${Date.now()}`;
    const botPath = path.resolve(process.cwd(), "bots", folderName);

    // Copy template into new folder
    const templatePath = path.resolve(process.cwd(), "bot_template"); // <- create a template folder with your index.js + package.json
    copyDirSync(templatePath, botPath);

    // create .env or config for this instance
    const envObj = {
      WHATSAPP_NUMBER: ownerNumber,
      // optionally other env keys like config.ownerNumber fallback
    };
    fs.writeFileSync(path.join(botPath, ".env"), Object.entries(envObj).map(([k,v])=>`${k}=${v}`).join("\n"));

    // Start PM2 process with cwd set to botPath so process.cwd() inside bot is botPath
    const pm2Name = folderName;
    try {
      // attempt to start via pm2 programmatically
      await execAsync(`pm2 start index.js --name ${pm2Name} --cwd "${botPath}" --update-env`);
    } catch (pmErr) {
      console.error("PM2 start error:", pmErr.message || pmErr);
      return res.status(500).json({ success:false, message:"Failed to start bot process", error: pmErr.message });
    }

    // Save deployment record (status running for now)
    const deployment = await Deployment.create({
      user: userId,
      ownerNumber,
      plan,
      status: "starting",
      folderName,
      expiryDate: expiry,
    });

    // Poll for pairing.json (timeout 60s)
    const pairingFile = path.join(botPath, "pairing.json");
    const timeoutMs = 60 * 1000;
    const startedAt = Date.now();
    let pairing = null;

    while (Date.now() - startedAt < timeoutMs) {
      if (fs.existsSync(pairingFile)) {
        try {
          const raw = fs.readFileSync(pairingFile, "utf8");
          pairing = JSON.parse(raw);
          break;
        } catch (readErr) {
          console.warn("Pairing file present but couldn't parse yet, retrying...");
        }
      }
      await sleep(1000);
    }

    // update deployment status
    if (pairing) {
      deployment.status = "waiting_for_pairing";
      await deployment.save();

      // Return pairing code and deployment info
      return res.json({
        success: true,
        message: "Bot started. Pairing code available.",
        pairing,
        deployment,
      });
    } else {
      // pairing timed out — leave process running, but reflect status
      deployment.status = "started_no_pairing";
      await deployment.save();

      return res.status(502).json({
        success: false,
        message: "Bot started but pairing code not available within timeout. Check logs on server.",
        deployment,
      });
    }
  } catch (err) {
    console.error("Start bot error:", err);
    res.status(500).json({ success: false, message: "Server error starting bot", error: err.message });
  }
};
