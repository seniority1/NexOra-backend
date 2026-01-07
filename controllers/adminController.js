import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";
import User from "../models/User.js";
import GiftLog from "../models/GiftLog.js";        // ← Gift logging
import Broadcast from "../models/Broadcast.js";
import Deployment from "../models/Deployment.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "1h";

// HARDCODED IP — ONLY YOU CAN EVER LOGIN
const MY_IP = "197.211.63.149";

function issueToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ==========================================================
   ADMIN LOGIN
   ========================================================== */
export const adminLogin = async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body;
    const ip = MY_IP;
    const ua = req.get("user-agent") || "Unknown Device";

    const auditBase = {
      email: email?.toLowerCase() || email,
      ip,
      userAgent: ua,
      deviceInfo: ua.substring(0, 150),
      fingerprint: deviceFingerprint || "not-provided",
    };

    const admin = await Admin.findOne({ email: email?.toLowerCase() });
    if (!admin || !admin.active) {
      await LoginAudit.create({ ...auditBase, success: false, reason: "invalid/disabled account" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "wrong password" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // IP Check
    if (admin.allowedIPs?.length > 0 && !admin.allowedIPs.includes(ip)) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "IP blocked" });
      return res.status(403).json({ message: "Access denied" });
    }

    const fingerprint = deviceFingerprint || "none";
    const isTrusted = admin.trustedDevices.some((d) => d.fingerprint === fingerprint);
    const isVeryFirstLoginEver = admin.trustedDevices.length === 0;

    if (!isTrusted && !isVeryFirstLoginEver && fingerprint !== "not-provided") {
      return res.status(403).json({ message: "New device detected. Manual approval required." });
    }

    if (isVeryFirstLoginEver && fingerprint !== "not-provided") {
      await Admin.updateOne(
        { _id: admin._id },
        { $push: { trustedDevices: { fingerprint, deviceInfo: ua.substring(0, 150), addedAt: new Date(), ipAtTrust: ip } } }
      );
    }

    await LoginAudit.create({ ...auditBase, admin: admin._id, success: true, reason: "Login success" });

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = issueToken(admin);
    return res.json({ success: true, token, admin: { name: admin.name, email: admin.email } });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET ALL USERS
   ========================================================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email coins createdAt").sort({ createdAt: -1 });
    return res.json({ success: true, total: users.length, users });
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching users" });
  }
};

/* ==========================================================
   ADD COINS
   ========================================================== */
export const addCoins = async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = (user.coins || 0) + Number(amount);
    await user.save();

    await GiftLog.create({ user: user._id, name: user.name, email: user.email, amount: Number(amount), date: new Date() });
    return res.json({ success: true, message: "Coins added", newBalance: user.coins });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET GIFT HISTORY
   ========================================================== */
export const getGiftedUsers = async (req, res) => {
  try {
    const gifts = await GiftLog.find().sort({ date: -1 }).lean();
    return res.json({ success: true, total: gifts.length, gifts });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   BAN / UNBAN
   ========================================================== */
export const banUser = async (req, res) => {
  try {
    const { email, reason } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBanned = true;
    user.banReason = reason || "Violation of terms";
    await user.save();
    return res.json({ success: true, message: "User banned" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBanned = false;
    await user.save();
    return res.json({ success: true, message: "User unbanned" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET ALL DEPLOYMENTS (UPDATED FIX)
   ========================================================== */
export const getAllDeployments = async (req, res) => {
  try {
    // 1. Raw count check to verify collection connectivity
    const countTotal = await Deployment.countDocuments();
    console.log(`[DEBUG] Total items found in deployments collection: ${countTotal}`);

    // 2. Fetch all bots
    const bots = await Deployment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // 3. Ensure we send 'total' explicitly for your dashboard.js
    return res.json({
      success: true,
      total: bots.length, // This drives the dashboard counter
      activeCount: bots.filter(b => b.status === "online").length,
      bots
    });
  } catch (err) {
    console.error("Fetch deployments failed:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error fetching bots",
      error: err.message 
    });
  }
};

/* ==========================================================
   SECURITY LOGS & BROADCAST
   ========================================================== */
export const getSecurityLogs = async (req, res) => {
  try {
    const logs = await LoginAudit.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, total: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const { title, message } = req.body;
    const broadcast = await Broadcast.create({ title, message, sentBy: req.admin.email });
    global.io?.emit("newBroadcast", broadcast);
    return res.json({ success: true, message: "Broadcast sent", broadcast });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
