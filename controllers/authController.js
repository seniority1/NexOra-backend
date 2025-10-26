import bcrypt from "bcrypt";
import User from "../models/User.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // 💾 Save user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
      codeExpiresAt,
    });
    await newUser.save();

    // ✅ Respond immediately (don’t wait for email)
    res.status(201).json({
      success: true,
      message: "Registration successful! A verification code has been sent to your email.",
    });

    // 📧 Send email using Resend
    try {
      await resend.emails.send({
        from: "NexOra <onboarding@nexora.com>",
        to: email,
        subject: "Your NexOra Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Welcome to NexOra, ${name}!</h2>
            <p>Use the verification code below to activate your account:</p>
            <h1 style="color:#00ff88; letter-spacing:3px;">${verificationCode}</h1>
            <p>This code will expire in <b>10 minutes</b>.</p>
            <p>If you didn’t request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`📨 Verification email sent via Resend to ${email}`);
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr.message);
    }
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
 * ✅ Verify code and activate account
 */
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate
    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Check if already verified
    if (user.verified) {
      return res.status(200).json({ message: "User already verified." });
    }

    // Validate code and expiration
    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (new Date() > user.codeExpiresAt) {
      return res.status(400).json({ message: "Verification code expired." });
    }

    // ✅ Mark as verified
    user.verified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account verified successfully!",
    });
  } catch (err) {
    console.error("❌ Verification Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Verification failed.",
      error: err.message,
    });
  }
};
