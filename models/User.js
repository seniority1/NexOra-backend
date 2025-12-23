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
    // 📞 ADDED/FIXED: phoneNumber (Clean index)
    phoneNumber: {
      type: String,
      unique: true, // This creates the index automatically
      sparse: true, // Allows multiple users to have 'null' if phone isn't required
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
