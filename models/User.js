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
      default: null, // stores the 6-digit code
    },
    codeExpiresAt: {
      type: Date,
      default: null, // timestamp when code expires
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
