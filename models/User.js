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
      // Sparse index handles uniqueness for optional numbers
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
    // Specifically for the Admin User Table "Time Ago" logic
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Flag to prevent duplicate "0 coins" notifications
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
    // 🗑️ STATIC ARRAY REMOVED: Clashed with Deployment.js collection
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
  { 
    timestamps: true,
    // 🔥 ESSENTIAL: Allows frontend to see virtual 'activeBots'
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Sparse index for unique phone numbers
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });

// 🔗 VIRTUAL LINK: Connects User to the Deployment Collection 
// This fixes the "0/5" mismatch by reading real-time bot data
userSchema.virtual('activeBots', {
  ref: 'Deployment',      // Matches the model name in Deployment.js
  localField: '_id',      // The User's ID
  foreignField: 'user',   // The field in Deployment.js that stores User ID
});

userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "NEX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
