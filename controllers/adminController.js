import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import LoginAudit from "../models/LoginAudit.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "1h"; // short lived

// helper to issue token
function issueToken(admin) {
  return jwt.sign({ id: admin._id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export const adminLogin = async (req, res) => {
  try {
    const { email, password, deviceFingerprint, deviceInfo } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
    const ua = req.get("user-agent") || "";

    const auditBase = { email, ip, userAgent: ua, deviceInfo: deviceInfo || "", fingerprint: deviceFingerprint || "" };

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      await LoginAudit.create({ ...auditBase, success: false, reason: "no such admin" });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!admin.active) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "account disabled" });
      return res.status(403).json({ success: false, message: "Account disabled" });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "bad password" });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Optional policy: require deviceFingerprint match / or flag unknown device
    let deviceKnown = false;
    if (deviceFingerprint) {
      deviceKnown = admin.trustedDevices.some(d => d.fingerprint === deviceFingerprint);
    }

    // Log audit success
    await LoginAudit.create({ ...auditBase, admin: admin._id, success: true, reason: deviceKnown ? "login_success_known_device" : "login_success_new_device" });

    // update last login
    admin.lastLoginAt = new Date();
    // if new device and you want to auto-trust it: you may push to admin.trustedDevices here
    // admin.trustedDevices.push({ fingerprint: deviceFingerprint, deviceInfo });
    await admin.save();

    const token = issueToken(admin);
    res.json({ success: true, token, admin: { email: admin.email, name: admin.name } , deviceKnown });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
