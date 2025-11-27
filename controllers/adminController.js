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

    // Get real client IP
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

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.active) {
      await LoginAudit.create({ ...auditBase, success: false, reason: "invalid/disabled account" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "wrong password" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // STRICT IP CHECK
    if (admin.allowedIPs?.length > 0 && !admin.allowedIPs.includes(ip)) {
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "IP not whitelisted" });
      return res.status(403).json({ message: "Access denied: Your IP is not authorized" });
    }

    // AUTO-TRUST FIRST DEVICE (THIS IS THE ONLY NEW LINE)
    const deviceTrusted = admin.trustedDevices.some(d => d.fingerprint === deviceFingerprint);
    if (!deviceTrusted && deviceFingerprint) {
      await Admin.updateOne(
        { _id: admin._id },
        {
          $push: {
            trustedDevices: {
              fingerprint: deviceFingerprint,
              deviceInfo: ua.substring(0, 150),
              addedAt: new Date()
            }
          }
        }
      );
      console.log(`AUTO-TRUSTED NEW DEVICE: ${deviceFingerprint}`);
    }
    // END OF NEW LINE

    // STRICT DEVICE CHECK (now allows first-time trust)
    if (!deviceTrusted && deviceFingerprint && admin.trustedDevices.length > 0) {
      // Only block if we have trusted devices AND this one isn't trusted
      await LoginAudit.create({ ...auditBase, admin: admin._id, success: false, reason: "Untrusted device" });
      return res.status(403).json({ message: "This device is not trusted. Access denied." });
    }

    // SUCCESS
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
