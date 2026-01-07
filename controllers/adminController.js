import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";
import User from "../models/User.js";
import GiftLog from "../models/GiftLog.js";        // ← NEW: Gift logging
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
   ADMIN LOGIN (unchanged – still unbreakable)
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
      await LoginAudit.create({
        ...auditBase,
        admin: admin._id,
        success: false,
        reason: "wrong password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (admin.allowedIPs?.length > 0 && !admin.allowedIPs.includes(ip)) {
      await LoginAudit.create({
        ...auditBase,
        admin: admin._id,
        success: false,
        reason: "IP blocked",
      });
      return res.status(403).json({ message: "Access denied" });
    }

    const fingerprint = deviceFingerprint || "none";
    const isTrusted = admin.trustedDevices.some((d) => d.fingerprint === fingerprint);
    const isVeryFirstLoginEver = admin.trustedDevices.length === 0;

    if (!isTrusted && !isVeryFirstLoginEver && fingerprint !== "not-provided") {
      await LoginAudit.create({
        ...auditBase,
        admin: admin._id,
        success: false,
        reason: "untrusted device - manual approval required",
      });
      return res.status(403).json({
        message: "New device detected. Login from a trusted device to approve this one.",
      });
    }

    if (isVeryFirstLoginEver && fingerprint !== "not-provided") {
      await Admin.updateOne(
        { _id: admin._id },
        {
          $push: {
            trustedDevices: {
              fingerprint,
              deviceInfo: ua.substring(0, 150),
              addedAt: new Date(),
              ipAtTrust: ip,
            },
          },
        }
      );
      console.log(`FIRST DEVICE AUTO-TRUSTED: \( {fingerprint} (IP: \){ip})`);
    }

    await LoginAudit.create({
      ...auditBase,
      admin: admin._id,
      success: true,
      reason: isTrusted ? "trusted device" : "first device auto-trusted (one-time)",
    });

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = issueToken(admin);

    return res.json({
      success: true,
      token,
      admin: { name: admin.name, email: admin.email },
      message: "Login successful",
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET ALL USERS (unchanged)
   ========================================================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email coins createdAt").sort({ createdAt: -1 });
    return res.json({ success: true, total: users.length, users });
  } catch (err) {
    console.error("Fetch users failed:", err);
    return res.status(500).json({ message: "Server error fetching users" });
  }
};

/* ==========================================================
   ADD COINS + LOG GIFT (updated – now logs every gift)
   ========================================================== */
export const addCoins = async (req, res) => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const addedAmount = Number(amount);
    user.coins = (user.coins || 0) + addedAmount;
    await user.save();

    // LOG THE GIFT
    await GiftLog.create({
      user: user._id,
      name: user.name || "Unknown",
      email: user.email,
      amount: addedAmount,
      date: new Date(),
    });

    return res.json({
      success: true,
      message: "Coins added successfully",
      newBalance: user.coins,
    });
  } catch (err) {
    console.error("Add coins error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   NEW: GET ALL GIFTED USERS HISTORY
   ========================================================== */
export const getGiftedUsers = async (req, res) => {
  try {
    const gifts = await GiftLog.find()
      .select("name email amount date")
      .sort({ date: -1 })
      .lean();

    return res.json({
      success: true,
      total: gifts.length,
      gifts,
    });
  } catch (err) {
    console.error("Get gifted users error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// BAN USER
export const banUser = async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isBanned) {
      return res.status(400).json({ message: "User already banned" });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = req.admin.email; // from verifyAdmin middleware
    user.banReason = reason || "Violation of terms";
    await user.save();

    return res.json({
      success: true,
      message: "User banned permanently",
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Ban error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// UNBAN USER
export const unbanUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isBanned) {
      return res.status(400).json({ message: "User is not banned" });
    }

    user.isBanned = false;
    user.bannedAt = null;
    user.bannedBy = null;
    user.banReason = null;
    await user.save();

    return res.json({
      success: true,
      message: "User unbanned successfully",
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Unban error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET ALL DEPLOYMENTS (The "Active Bots" View)
   ========================================================== */
export const getAllDeployments = async (req, res) => {
  try {
    // We populate the user to see who owns each bot
    const bots = await Deployment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      total: bots.length,
      activeCount: bots.filter(b => b.status === "online").length,
      bots
    });
  } catch (err) {
    console.error("Fetch deployments failed:", err);
    return res.status(500).json({ message: "Server error fetching bots" });
  }
};


// GET SECURITY LOGS — All login attempts, bans, etc
export const getSecurityLogs = async (req, res) => {
  try {
    const logs = await LoginAudit.find()
      .sort({ createdAt: -1 })  // Newest first
      .limit(100)  // Last 100 for performance
      .lean();  // Faster

    return res.json({
      success: true,
      total: logs.length,
      logs,
    });
  } catch (err) {
    console.error("Get security logs error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// BROADCAST TO ALL USERS
export const sendBroadcast = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message required" });
    }

    const broadcast = await Broadcast.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: req.admin.email,
    });

    // SEND TO ALL CONNECTED USERS IN REAL TIME
    global.io?.emit("newBroadcast", {
      _id: broadcast._id,
      title: broadcast.title,
      message: broadcast.message,
      sentAt: broadcast.sentAt,
    });

    return res.json({
      success: true,
      message: "Broadcast sent to all users",
      broadcast,
    });
  } catch (err) {
    console.error("Broadcast error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
