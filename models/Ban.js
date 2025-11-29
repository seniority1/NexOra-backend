// models/Ban.js
import mongoose from "mongoose";

const banSchema = new mongoose.Schema({
  email: { type: String },              // optional – for reference
  ip: { type: String, required: true },
  fingerprint: { type: String, required: true },  // device hash
  reason: { type: String, default: "Permanent ban by King" },
  bannedBy: { type: String, required: true },    // admin email
  bannedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Ban", banSchema);
