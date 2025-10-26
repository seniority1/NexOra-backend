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
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // 🧩 Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

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
      verified: false,
    });
    await newUser.save();

    // ✅ Respond immediately
    res.status(201).json({
      success: true,
      message: "Registration successful! Verification code sent to your email.",
    });

    // 📧 Send email asynchronously with logging
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        to: email,
        subject: "Your NexOra Verification Code",
        html: `
          <div style="font-family: Arial; line-height: 1.6;">
            <h2>Welcome to NexOra, ${name}!</h2>
            <p>Use this verification code to activate your account:</p>
            <h1 style="color:#00ff88; letter-spacing:3px;">${verificationCode}</h1>
            <p>This code will expire in <b>10 minutes</b>.</p>
            <p>If you didn’t request this, ignore this email.</p>
          </div>
        `,
      });
      console.log(`✅ Email sent successfully to ${email}: ${info.response}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send email to ${email}: ${emailErr.message}`);
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
 * ✅ Verify code and issue JWT
 */
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (user.verified) {
      return res.status(200).json({ success: true, message: "User already verified." });
    }

    // 🔍 Check if code is valid and not expired
    if (user.verificationCode !== code || new Date() > user.codeExpiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired code." });
    }

    // ✅ Mark as verified
    user.verified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    // 🔑 Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // token valid for 7 days
    );

    res.status(200).json({
      success: true,
      message: "Account verified successfully!",
      token, // send token to frontend
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error("❌ Verification Error:", err.message);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};
