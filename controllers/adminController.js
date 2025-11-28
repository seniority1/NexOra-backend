import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";
import User from "../models/User.js";

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

export const adminLogin = async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body;

    // FORCE YOUR IP — IGNORE ALL HEADERS
    const ip = MY_IP;

    const ua = req.get("user-agent") || "Unknown Device";

    const auditBase = {
      email,
      ip,
      userAgent: ua,
      deviceInfo: ua.substring(0, 150),
      fingerprint: deviceFingerprint || "not-provided",
    };

    const admin = await Admin.findOne({ email: email.toLowerCase() });
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

    const deviceAlreadyTrusted = admin.trustedDevices.some(
      (d) => d.fingerprint === deviceFingerprint
    );

    if (!deviceAlreadyTrusted && deviceFingerprint && deviceFingerprint !== "not-provided") {
      await Admin.updateOne(
        { _id: admin._id },
        {
          $push: {
            trustedDevices: {
              fingerprint: deviceFingerprint,
              deviceInfo: ua.substring(0, 150),
              addedAt: new Date(),
            },
          },
        }
      );
      console.log(`NEW DEVICE AUTO-TRUSTED: ${deviceFingerprint}`);
    }

    if (!deviceAlreadyTrusted && admin.trustedDevices.length > 0 && deviceFingerprint !== "not-provided") {
      await LoginAudit.create({
        ...auditBase,
        admin: admin._id,
        success: false,
        reason: "Untrusted device",
      });
      return res.status(403).json({ message: "This device is not trusted. Access denied." });
    }

    await LoginAudit.create({
      ...auditBase,
      admin: admin._id,
      success: true,
      reason: deviceAlreadyTrusted
        ? "login success - trusted device"
        : "login success - first trusted device",
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

// ========================================
// ✅ FETCH ALL USERS
// ========================================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email coins createdAt").sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: users.length,
      users,
    });
  } catch (err) {
    console.error("Fetch users failed:", err);
    return res.status(500).json({ message: "Server error fetching users" });
  }
};

// ========================================
// ✅ GET ALL GIFTED USERS
// ========================================
export const getGiftedUsers = async (req, res) => {
  try {
    // Fetch all users who have at least one gift transaction
    const users = await User.find({ "transactions.type": "gift" }, "name email transactions").sort({ "transactions.createdAt": -1 });

    // Flatten the gifted transactions
    const giftedUsers = [];
    users.forEach(user => {
      user.transactions.forEach(tx => {
        if (tx.type === "gift") {
          giftedUsers.push({
            name: user.name,
            email: user.email,
            amount: tx.amount,
            createdAt: tx.createdAt,
          });
        }
      });
    });

    // Sort by most recent first
    giftedUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      total: giftedUsers.length,
      users: giftedUsers,
    });
  } catch (err) {
    console.error("Fetch gifted users error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching gifted users",
    });
  }
};

// ========================================
// ✅ ADD COINS TO USER
// ========================================
export const addCoins = async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = (user.coins || 0) + Number(amount);
    await user.save();

    return res.json({
      success: true,
      message: "Coins added",
      coins: user.coins,
    });
  } catch (err) {
    console.error("Add coins error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
