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

    res.status(201).json({
      success: true,
      message: "Registration successful! A verification code has been sent to your email.",
    });

    // EMAIL SENDING BLOCK
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error("🚨 Missing RESEND_API_KEY in environment variables!");
        return;
      }

      console.log("🔑 Resend API Key detected:", process.env.RESEND_API_KEY.slice(0, 8) + "...");

      // ✅ Updated sender to use onboarding@resend.dev
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

      console.log("📦 Email payload ready:", {
        to: emailPayload.to,
        from: emailPayload.from,
        subject: emailPayload.subject,
      });

      const result = await resend.emails.send(emailPayload);

      console.log("✅ Email send response:", result);
      console.log(`📨 Verification email successfully sent to ${email}`);
    } catch (emailErr) {
      console.error("❌ Email send failed!");
      console.error("Error Name:", emailErr.name);
      console.error("Error Message:", emailErr.message);
      console.error("Error Stack:", emailErr.stack);
      if (emailErr.response) {
        console.error("Resend API Response:", JSON.stringify(emailErr.response, null, 2));
      }
    }
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    console.error(err.stack);
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
    console.log("\n🟢 [VERIFY CODE]");
    console.log("Email:", email);
    console.log("Code:", code);

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ No user found for:", email);
      return res.status(404).json({ message: "User not found." });
    }

    if (user.verified) {
      console.log("⚠️ User already verified:", email);
      return res.status(200).json({ message: "User already verified." });
    }

    if (user.verificationCode !== code) {
      console.log("❌ Invalid code entered for:", email);
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (new Date() > user.codeExpiresAt) {
      console.log("⏰ Code expired for:", email);
      return res.status(400).json({ message: "Verification code expired." });
    }

    user.verified = true;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    console.log("✅ User verified:", email);

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
