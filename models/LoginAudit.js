import mongoose from "mongoose";

const loginAuditSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: false },
  email: String,
  ip: String,
  userAgent: String,
  deviceInfo: String,
  fingerprint: String,
  success: Boolean,
  reason: String,
  createdAt: { type: Date, default: Date.now },
});

const LoginAudit = mongoose.model("LoginAudit", loginAuditSchema);
export default LoginAudit;
