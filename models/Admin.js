import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "admin" },
  allowedIPs: [{ type: String }],

  // 🔥 Devices already allowed
  trustedDevices: [
    {
      fingerprint: String,
      deviceInfo: String,
      ipAtTrust: String,
      addedAt: { type: Date, default: Date.now },
    },
  ],

  // 🔥 NEW: Devices waiting for your "Allow" click
  pendingDevices: [
    {
      fingerprint: String,
      deviceInfo: String,
      ip: String,
      attemptedAt: { type: Date, default: Date.now },
    },
  ],

  active: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
