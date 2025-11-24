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

    // 🪙 NexCoins balance
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🕒 Pending referral reward (locked until first purchase)
    pendingReferralCoins: {
      type: Number,
      default: 0,
    },

    // 🎁 Referral system
    referralCode: {
      type: String,
      unique: true,
    },

    referredBy: {
      type: String, // stores referralCode of the referrer
      default: null,
    },

    // 📜 Coin transaction history
    transactions: [
      {
        amount: Number,
        type: { type: String, enum: ["purchase", "spend", "reward"] },
        date: { type: Date, default: Date.now },
        description: String,
      },
    ],

    // 🚀 Deployments
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
  },
  { timestamps: true }
);

// 🧩 Auto-generate unique referral code
userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "NEX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
