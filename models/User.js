import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    // 📞 phoneNumber (Clean index)
    phoneNumber: {
      type: String,
      unique: true, 
      sparse: true, 
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      default: null,
    },
    codeExpiresAt: {
      type: Date,
      default: null,
    },
    // 🔐 ADDED: Password Reset Fields (Fixes the "Invalid Code" issue)
    resetCode: {
      type: String,
      default: null,
    },
    resetCodeExpiresAt: {
      type: Date,
      default: null,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingReferralCoins: {
      type: Number,
      default: 0,
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: String, 
      default: null,
    },
    // ⚙️ User Preferences for Settings
    preferences: {
      deployAlerts: { type: Boolean, default: true },
      broadcastAlerts: { type: Boolean, default: true },
      txAlerts: { type: Boolean, default: true }
    },
    // 📱 Session Management for multi-device tracking
    sessions: [
      {
        device: { type: String, default: "Unknown Device" },
        ip: { type: String },
        token: { type: String },
        lastActive: { type: Date, default: Date.now }
      }
    ],
    transactions: [
      {
        amount: Number,
        type: { type: String, enum: ["purchase", "spend", "reward"] },
        date: { type: Date, default: Date.now },
        description: String,
      },
    ],
    deployments: [
      {
        name: String,
        status: {
          type: String,
          enum: ["active", "paused", "deleted"],
          default: "active",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
    },
    bannedBy: {
      type: String,
    },
    banReason: {
      type: String,
      default: "No reason provided",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "NEX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
