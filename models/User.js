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

    // 🪙 NexCoin system
    coins: {
      type: Number,
      default: 0, // Real coins user owns
      min: 0,
    },

    // 🧾 Optional: track user’s coin purchases
    transactions: [
      {
        amount: Number,
        type: { type: String, enum: ["purchase", "spend", "reward"] },
        date: { type: Date, default: Date.now },
        description: String,
      },
    ],

    // 🚀 Placeholder for deployed projects
    deployments: [
      {
        name: String,
        status: { type: String, enum: ["active", "paused", "deleted"], default: "active" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
