import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    verified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    codeExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
