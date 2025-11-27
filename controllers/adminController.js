import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "1h";

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

    // Get real client IP (works on Render, Cloudflare, etc.)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.socket.remoteAddress;

    const ua = req.get("user-agent") || "";
    const auditBase = {
      email,
      ip,
      userAgent: ua,
      fingerprint: deviceFingerprint || "",
    };

    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.active) {
      await LoginAudit.create({ ...auditBase, success: false, reason: "invalid/disabled account" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // PASSWORD CHECK
    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "wrong password" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // STRICT IP WHITELIST — BLOCK IF NOT ALLOWED
    if (admin.allowedIPs?.length > 0 && !admin.allowedIPs.includes(ip)) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "IP not whitelisted" });
      return res.status(403).json({ message: "Access denied: Your IP is not authorized" });
    }

    // STRICT DEVICE CHECK — BLOCK IF NOT TRUSTED
    const deviceTrusted = admin.trustedDevices.some(
      (d) => d.fingerprint === deviceFingerprint
    );

    if (!deviceTrusted) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "Untrusted device" });
      return res.status(403).json({ message: "This device is not trusted. Access denied." });
    }

    // ALL CHECKS PASSED — Login success
    await LoginAudit.create({
      ...auditBase,
      admin: admin._id,
      success: true,
      reason: "login success - trusted device & IP",
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
