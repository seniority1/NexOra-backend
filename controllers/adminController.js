import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";
import User from "../models/User.js";
import GiftLog from "../models/GiftLog.js";        
import Broadcast from "../models/Broadcast.js";
import Deployment from "../models/Deployment.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "1h";

// HARDCODED IP — ONLY YOU CAN EVER LOGIN
const MY_IP = " 197.211.53.80";

function issueToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ==========================================================
   ADMIN LOGIN (WITH DEVICE TRAP & PROXY IP FIX)
   ========================================================== */
export const adminLogin = async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body;
    
    // 🔥 FIX: Get real public IP even behind Render/Cloudflare/Heroku proxies
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.socket.remoteAddress || 
               req.ip || 
               "Unknown IP";
               
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

    // 1. Check if device is trusted
    const fingerprint = deviceFingerprint || "not-provided";
    const isTrusted = admin.trustedDevices.some((d) => d.fingerprint === fingerprint);
    const isVeryFirstLoginEver = admin.trustedDevices.length === 0;

    // 🔥 THE DEVICE TRAP: Password is correct, but device is unknown
    if (!isTrusted && !isVeryFirstLoginEver) {
      
      // Update the admin document to include this attempt in a 'pendingDevices' array
      await Admin.updateOne(
        { _id: admin._id },
        { 
          $addToSet: { 
            pendingDevices: { 
              fingerprint, 
              deviceInfo: ua.substring(0, 100), 
              ip, 
              attemptedAt: new Date() 
            } 
          } 
        }
      );

      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "Device Pending Approval" });
      
      return res.status(403).json({ 
        success: false, 
        needsApproval: true,
        message: "Device not recognized. Approval request sent to primary administrator." 
      });
    }

    // Auto-trust the very first device used for this admin
    if (isVeryFirstLoginEver && fingerprint !== "not-provided") {
      await Admin.updateOne(
        { _id: admin._id },
        { 
          $push: { 
            trustedDevices: { 
              fingerprint, 
              deviceInfo: ua.substring(0, 150), 
              addedAt: new Date(), 
              ipAtTrust: ip 
            } 
          } 
        }
      );
    }

    // Success Logic
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
   APPROVE PENDING DEVICE
   ========================================================== */
export const approveDevice = async (req, res) => {
  try {
    const { deviceId, adminPassword } = req.body;
    
    // 1. Find the admin (the one currently logged in and clicking the button)
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // 2. Verify password before allowing a new device fingerprint
    const isMatch = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: "Security Check Failed: Incorrect Password" });

    // 3. Find the specific device in the pending list
    const pendingItem = admin.pendingDevices.id(deviceId);
    if (!pendingItem) return res.status(404).json({ message: "Pending request not found" });

    // 4. Move to Trusted and Remove from Pending
    admin.trustedDevices.push({
      fingerprint: pendingItem.fingerprint,
      deviceInfo: pendingItem.deviceInfo,
      ipAtTrust: pendingItem.ip,
      addedAt: new Date()
    });

    // Remove using the pull method or specific ID
    admin.pendingDevices.pull(deviceId);
    
    await admin.save();

    return res.json({ success: true, message: "Device successfully whitelisted" });
  } catch (err) {
    console.error("Approval Error:", err);
    return res.status(500).json({ message: "Server error during device approval" });
  }
};

/* ==========================================================
   GET PENDING DEVICES (For the Devices Page)
   ========================================================== */
export const getPendingDevices = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        return res.json({ success: true, pending: admin.pendingDevices });
    } catch (err) {
        return res.status(500).json({ message: "Error fetching devices" });
    }
};


/* ==========================================================
   GET ALL USERS
   ========================================================== */
export const getAllUsers = async (req, res) => {
  try {
    // 🔥 UPDATED: Added isBanned and banReason to the projection
    const users = await User.find({}, "name email coins createdAt lastLoginAt isBanned banReason")
      .sort({ createdAt: -1 });

    return res.json({ 
      success: true, 
      total: users.length, 
      users 
    });
  } catch (err) {
    console.error("Fetch Users Error:", err);
    return res.status(500).json({ message: "Server error fetching users" });
  }
};


/* ==========================================================
   ADD COINS + LOG GIFT
   ========================================================== */
export const addCoins = async (req, res) => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = (user.coins || 0) + Number(amount);
    await user.save();

    await GiftLog.create({
      user: user._id,
      name: user.name || "Unknown",
      email: user.email,
      amount: Number(amount),
      date: new Date(),
    });

    return res.json({ success: true, message: "Coins added successfully", newBalance: user.coins });
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
   USER STATUS (BAN/UNBAN)
   ========================================================== */
export const banUser = async (req, res) => {
  try {
    const { email, reason } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { isBanned: true, bannedAt: new Date(), bannedBy: req.admin.email, banReason: reason || "Violation" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, message: "User banned" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate({ email }, { isBanned: false, bannedAt: null }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, message: "User unbanned" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

/* ==========================================================
   GET ALL DEPLOYMENTS (TABLE VIEW + STATS)
   ========================================================== */
export const getAllDeployments = async (req, res) => {
  try {
    // 1. Fetch from DB
    const bots = await Deployment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[ADMIN DEBUG] Deployment query returned ${bots.length} records.`);

    // 2. Map data for the table (calculate days remaining)
    const now = new Date();
    const formattedBots = bots.map(bot => {
      const expiry = new Date(bot.expiryDate);
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...bot,
        ownerName: bot.user?.name || "Deleted User",
        ownerEmail: bot.user?.email || "N/A",
        daysRemaining: diffDays > 0 ? diffDays : 0,
        isExpired: diffDays <= 0
      };
    });

    // 3. Return both the total count and the full bot list
    return res.json({
      success: true,
      total: formattedBots.length,
      activeCount: formattedBots.filter(b => b.status === "online").length,
      bots: formattedBots
    });
  } catch (err) {
    console.error("Fetch deployments failed:", err);
    return res.status(500).json({ success: false, message: "Error loading deployments" });
  }
};

// DELETE DEPLOYMENT
export const deleteDeployment = async (req, res) => {
  try {
    const { id } = req.params; // Get ID from URL
    
    const bot = await Deployment.findByIdAndDelete(id);
    
    if (!bot) {
      return res.status(404).json({ success: false, message: "Bot not found" });
    }

    console.log(`[ADMIN] Bot for ${bot.phoneNumber} was deleted by ${req.admin.email}`);
    
    return res.json({
      success: true,
      message: `Engine for ${bot.phoneNumber} has been permanently deleted.`
    });
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ success: false, message: "Error deleting bot" });
  }
};

/* ==========================================================
   DELETE USER ACCOUNT (Full Wipe)
   ========================================================== */
export const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the user first to get their email (for logging)
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Delete all active bot deployments belonging to this user
    const deletedBots = await Deployment.deleteMany({ ownerEmail: user.email });

    // 3. Delete the actual user account
    await User.findByIdAndDelete(id);

    console.log(`[ADMIN ACTION] User ${user.email} and ${deletedBots.deletedCount} bots were permanently removed.`);

    res.json({ 
      success: true, 
      message: `User ${user.name} and their active bots have been deleted.` 
    });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ success: false, message: "Internal server error during deletion." });
  }
};

/* ==========================================================
   CLEAR ALL GIFT LOGS (Database Wipe)
   ========================================================== */
export const clearGiftLogs = async (req, res) => {
  try {
    // This removes every document inside the GiftLog collection
    const result = await GiftLog.deleteMany({});
    
    console.log(`[ADMIN ACTION] Gift Ledger was cleared by ${req.admin.email}. ${result.deletedCount} records removed.`);

    return res.json({ 
      success: true, 
      message: "The gift ledger has been permanently cleared." 
    });
  } catch (err) {
    console.error("Clear Logs Error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error while clearing logs." 
    });
  }
};



/* ==========================================================
   WIPE SECURITY LOGS (Audit Cleanup)
   ========================================================== */
export const clearSecurityLogs = async (req, res) => {
  try {
    // 🔥 This targets your specific model
    const result = await LoginAudit.deleteMany({}); 

    console.log(`[SECURITY] Audit logs cleared by admin: ${req.admin?.email || 'Unknown'}`);

    res.json({ 
      success: true, 
      message: `Security ledger cleared. ${result.deletedCount} entries removed.` 
    });
  } catch (err) {
    console.error("Clear Logs Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server failed to wipe audit logs." 
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
