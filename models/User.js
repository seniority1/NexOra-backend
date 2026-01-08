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
    phoneNumber: {
      type: String,
      // ✅ FIX: Removed default: null. 
      // This allows the sparse index to ignore empty phone numbers during registration.
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
    // 🔥 NEW: Specifically for the Admin User Table "Time Ago" logic
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // 🔔 Flag to prevent duplicate "0 coins" notifications
    notifiedExpiry: {
      type: Boolean,
      default: false,
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
    preferences: {
      deployAlerts: { type: Boolean, default: true },
      broadcastAlerts: { type: Boolean, default: true },
      txAlerts: { type: Boolean, default: true }
    },
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
          enum: ["active", "paused", "deleted", "expired"], 
          default: "active",
        },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date }, 
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

// ✅ Define index explicitly to fix warnings and handle optional unique phone numbers
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });

userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "NEX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
