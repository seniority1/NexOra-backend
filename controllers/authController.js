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

    console.log("\n🟢 [REGISTER ATTEMPT]");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Password Length:", password?.length);

    if (!name || !email || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("⚠️ Email already registered:", email);
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
      codeExpiresAt,
    });
    await newUser.save();

    console.log("✅ User saved successfully:", newUser._id);
    console.log("📨 Preparing to send email...");

    // EMAIL SENDING BLOCK
    let emailSent = false;
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error("🚨 Missing RESEND_API_KEY in environment variables!");
      } else {
        const emailPayload = {
          from: "NexOra <onboarding@resend.dev>",
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
        };

        const result = await resend.emails.send(emailPayload);
        console.log("✅ Email send response:", result);
        emailSent = true;
      }
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr.message);
      if (emailErr.response) {
        console.error("Resend API Response:", JSON.stringify(emailErr.response, null, 2));
      }
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful! A verification code has been sent to your email."
        : "Registration successful, but email could not be sent. Please try resending the code.",
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

/**
 * ✅ Verify user using code
 */
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("\n🟢 [VERIFY ATTEMPT]");
    console.log("Email:", email);
    console.log("Code:", code);

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified." });
    }

    if (user.verificationCode !== code) {
      console.log("❌ Invalid verification code");
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (user.codeExpiresAt < new Date()) {
      console.log("⚠️ Verification code expired");
      return res.status(400).json({ message: "Verification code expired." });
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    console.log("✅ User verified successfully:", user.email);

    res.json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    console.error("❌ Verify Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong during verification.",
      error: err.message,
    });
  }
};

/**
 * 🔁 Resend verification code
 */
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("\n🟢 [RESEND CODE ATTEMPT]");
    console.log("Email:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    // Generate a new code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log("📨 Sending new code...");

    try {
      const emailPayload = {
        from: "NexOra <onboarding@resend.dev>",
        to: email,
        subject: "Your New NexOra Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hello again, ${user.name}!</h2>
            <p>Your new verification code is:</p>
            <h1 style="color:#00ff88; letter-spacing:3px;">${newCode}</h1>
            <p>This code will expire in <b>10 minutes</b>.</p>
          </div>
        `,
      };

      const result = await resend.emails.send(emailPayload);
      console.log("✅ Resent verification email:", result);

      res.json({ success: true, message: "A new verification code has been sent to your email." });
    } catch (emailErr) {
      console.error("❌ Failed to resend email:", emailErr.message);
      res.status(500).json({
        success: false,
        message: "Failed to resend verification code. Please try again later.",
      });
    }
  } catch (err) {
    console.error("❌ Resend Code Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong while resending verification code.",
      error: err.message,
    });
  }
};
