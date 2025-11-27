import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true }, // bcrypt hash
  role: { type: String, default: "admin" },

  // optional allowlist of IPs that are allowed to login (strings)
  allowedIPs: [{ type: String }],

  // trusted devices (fingerprint hashes)
  trustedDevices: [
    {
      fingerprint: String,
      deviceInfo: String,
      addedAt: { type: Date, default: Date.now },
    },
  ],

  // account status
  active: { type: Boolean, default: true },

  // optional: last login
  lastLoginAt: Date,
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
