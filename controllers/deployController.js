// controllers/deploymentController.js  →  REPLACE YOUR CURRENT startBot WITH THIS
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
      return res.status(400).json({ success: false, message: "Missing data" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if ((user.coins || 0) < plan)
      return res.status(400).json({ success: false, message: "Not enough coins" });

    // Deduct coins
    user.coins -= plan;
    await user.save();

    // Calculate days
    const planDays = plan === 500 ? 7 : plan === 1000 ? 14 : plan === 1500 ? 21 : 28;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDays);

    // Unique folder
    const timestamp = Date.now();
    const folderName = `\( {ownerNumber.replace(/[^0-9]/g, "")}_ \){timestamp}`;
    const botPath = path.resolve(process.cwd(), "bots", folderName);

    fs.mkdirSync(botPath, { recursive: true });

    // Clone repo
    await execAsync(`git clone https://github.com/seniority1/NexOra.git "${botPath}" --depth=1`);

    // Install deps (fast on Render)
    await execAsync(`npm install --omit=dev`, { cwd: botPath });

    // Write .env
    fs.writeFileSync(
      path.join(botPath, ".env"),
      `WHATSAPP_NUMBER=\( {ownerNumber}\nUSER_ID= \){userId}\nDEPLOYMENT_ID=\( {folderName}\nEXPIRY_TIMESTAMP= \){expiryDate.getTime()}`
    );

    // Rename bot.js → index.js (if needed, some Render setups expect index.js)
    const botFile = path.join(botPath, "bot.js");
    const indexFile = path.join(botPath, "index.js");
    if (fs.existsSync(botFile) && !fs.existsSync(indexFile)) {
      fs.renameSync(botFile, indexFile);
    }

    // Start with PM2 (Render allows it in background)
    const pm2Name = `nexora_${folderName}`;
    await execAsync(`pm2 delete "${pm2Name}" --silent || true`);
    await execAsync(`pm2 start "\( {indexFile}" --name " \){pm2Name}" --update-env --no-autorestart`);

    // Save deployment
    const deployment = await Deployment.create({
      user: userId,
      ownerNumber,
      plan,
      folderName,
      pm2Name,
      status: "starting",
      expiryDate,
    });

    // Wait for pairing.json (max 55 seconds)
    const pairingFile = path.join(botPath, "pairing.json");
    let attempts = 0;
    while (attempts < 55) {
      if (fs.existsSync(pairingFile)) {
        const data = JSON.parse(fs.readFileSync(pairingFile, "utf8"));
        deployment.status = "waiting_for_scan";
        await deployment.save();

        return res.json({
          success: true,
          message: "Bot started! Enter this code in WhatsApp",
          pairingCode: data.code,
          deploymentId: deployment._id,
          expiresInDays: planDays,
        });
      }
      await sleep(1000);
      attempts++;
    }

    // No code yet → still okay
    deployment.status = "waiting_for_scan";
    await deployment.save();
    return res.json({
      success: true,
      message: "Bot is starting… Open WhatsApp → Linked Devices → Link with phone number",
      pairingCode: null,
      deploymentId: deployment._id,
      expiresInDays: planDays,
    });
  } catch (err) {
    console.error("Deploy error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
