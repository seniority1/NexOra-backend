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
    lastLoginAt: {
      type: Date,
      default: null,
    },
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
    /* 🔥 INTEGRATED VCF ENGINE SESSIONS 🔥 */
    vcfSessions: [
      {
        sessionId: { type: String, required: true },
        name: { type: String, required: true },
        duration: { type: Number, required: true },
        status: { 
          type: String, 
          enum: ['active', 'completed', 'expired'], 
          default: 'active' 
        },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        completedAt: { type: Date }, 
        
        participants: [{
          phone: { type: String, required: true },
          name: { type: String, required: true },
          joinedAt: { type: Date, default: Date.now },
          pushSubscription: {
            endpoint: { type: String },
            expirationTime: { type: Number },
            keys: {
              p256dh: { type: String },
              auth: { type: String }
            }
          }
        }]
      }
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

// ✅ Performance & Unique Indexes
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
// 🔥 Essential for finding pools via join links quickly
userSchema.index({ "vcfSessions.sessionId": 1 });

userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "NEX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
