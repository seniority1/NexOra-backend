import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";

/**
 * 🪄 Register a new NexOra user
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 🧠 Check for missing fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 🧩 Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered." });

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🎟️ Create verification token
    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 💾 Save user to DB (not yet verified)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });
    await newUser.save();

    // 📧 Setup email transport (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🌐 Create frontend verification link
    const verifyLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

    // 📨 Send email
    await transporter.sendMail({
      to: email,
      subject: "Verify your NexOra Account",
      html: `
        <div style="font-family: Arial; line-height: 1.6;">
          <h2>Welcome to NexOra, ${name}!</h2>
          <p>Click the button below to verify your account:</p>
          <a href="${verifyLink}" 
            style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Account
          </a>
          <p>Or copy this link: <br/> ${verifyLink}</p>
        </div>
      `,
    });

    // ✅ Response
    res.status(201).json({
      success: true,
      message: "Registration successful! Check your email for verification link.",
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong during registration.",
      error: err.message,
    });
  }
};
