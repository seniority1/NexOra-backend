import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";

/**
 * 🪄 Register a new NexOra user (with verification code)
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 🧠 Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 🧩 Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered." });

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔢 Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 💾 Save new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
      codeExpiresAt,
    });
    await newUser.save();

    // ✅ Respond immediately
    res.status(201).json({
      success: true,
      message: "Registration successful! A verification code has been sent to your email.",
    });

    // 📧 Send email *after* responding
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    transporter
      .sendMail({
        to: email,
        subject: "Your NexOra Verification Code",
        html: `
          <div style="font-family: Arial; line-height: 1.6;">
            <h2>Welcome to NexOra, ${name}!</h2>
            <p>Use the verification code below to activate your account:</p>
            <h1 style="color:#00ff88; letter-spacing:3px;">${verificationCode}</h1>
            <p>This code will expire in <b>10 minutes</b>.</p>
            <p>If you didn’t request this, please ignore this email.</p>
          </div>
        `,
      })
      .then(() => console.log(`📨 Verification email sent to ${email}`))
      .catch((err) => console.error("❌ Email send failed:", err.message));
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong during registration.",
      error: err.message,
    });
  }
};

/**
 * ✅ Verify user code
 */
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.verified) {
      return res.status(200).json({ success: true, message: "User already verified." });
    }

    // 🔍 Check code validity
    if (user.verificationCode !== code || new Date() > user.codeExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    // ✅ Mark verified
    user.verified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    res.status(200).json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    console.error("❌ Verification Error:", err.message);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};
