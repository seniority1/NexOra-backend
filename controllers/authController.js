import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || "nexora_secret_key";

/* 🪄 REGISTER — Create new user, referral support, and send verification code */
export const register = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;
    console.log("\n🟢 [REGISTER ATTEMPT]");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Referral Used:", referralCode || "none");
    console.log("Password Length:", password?.length);

    // 1️⃣ Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 2️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // 3️⃣ Validate referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
    }

    // 4️⃣ Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Generate secure 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 6️⃣ Create new user (referralCode auto-generated in User model)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
      codeExpiresAt,
      referredBy: referralCode || null,
    });
    await newUser.save();
    console.log("✅ User saved successfully:", newUser._id);

    // 7️⃣ If referral used, add pending coins to referrer
    if (referrer) {
      referrer.pendingReferralCoins = (referrer.pendingReferralCoins || 0) + 100;

      referrer.transactions = referrer.transactions || [];
      referrer.transactions.push({
        amount: 100,
        type: "reward",
        description: `Referral reward pending for inviting ${name}`,
        date: new Date(),
      });

      await referrer.save();
      console.log("🎁 Pending referral coins added for", referrer.email);
    }

    // 8️⃣ Send verification email
    console.log("📨 Sending verification email...");
    await sendEmail({
      to: email,
      subject: "Your NexOra Verification Code",
      html: `
        <h2>Welcome to NexOra, ${name}!</h2>
        <p>Your verification code:</p>
        <h1 style="color:#00ff88;">${verificationCode}</h1>
        <p>Expires in <b>10 minutes</b>.</p>
      `,
    });

    // 9️⃣ Respond to client
    res.status(201).json({
      success: true,
      message: "Registration successful! Verification code sent.",
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: err.message,
    });
  }
};
/* ✅ VERIFY CODE */
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("\n🟢 [VERIFY CODE]");
    console.log("Email:", email, "| Code:", code);

    if (!email || !code) {
      console.log("❌ Missing email or code");
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ No user found for:", email);
      return res.status(404).json({ message: "User not found." });
    }

    if (user.verified) {
      console.log("⚠️ Already verified:", email);
      return res.status(200).json({ message: "User already verified." });
    }

    if (user.verificationCode !== code) {
      console.log("❌ Invalid verification code for:", email);
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

    console.log("✅ User verified successfully:", email);

    res.status(200).json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    console.error("❌ Verify Error:", err.message);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};

/* 🔁 RESEND VERIFICATION CODE */
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("\n🟡 [RESEND VERIFICATION CODE]");
    console.log("Email:", email);

    if (!email) {
      console.log("❌ Missing email");
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ message: "User not found." });
    }

    if (user.verified) {
      console.log("⚠️ User already verified:", email);
      return res.status(400).json({ message: "User already verified." });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log("📨 Sending new verification code:", newCode);

    await sendEmail({
      to: email,
      subject: "Your New NexOra Verification Code",
      html: `
        <h2>Hello again!</h2>
        <p>Here’s your new NexOra code:</p>
        <h1 style="color:#00ff88;">${newCode}</h1>
        <p>Expires in <b>10 minutes</b>.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "New verification code sent successfully!",
    });
  } catch (err) {
    console.error("❌ Resend Error:", err.message);
    res.status(500).json({ success: false, message: "Resend failed." });
  }
};

/* 🔐 LOGIN (Now returns JWT token) */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("\n🟢 [LOGIN ATTEMPT]");
    console.log("Email:", email);

    if (!email || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "Email and password required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.verified) {
      console.log("⚠️ Unverified user:", email);
      return res.status(403).json({ message: "Please verify your account first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Incorrect password for:", email);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // 🧾 Generate JWT Token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ Login successful for:", email);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    res.status(500).json({ success: false, message: "Login failed." });
  }
};

/* 🧠 FORGOT PASSWORD — Send reset code */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("\n🟡 [FORGOT PASSWORD]");
    console.log("Email:", email);

    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ No user found for:", email);
      return res.status(404).json({ message: "User not found." });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log("📨 Sending reset code:", resetCode);

    await sendEmail({
      to: email,
      subject: "Your NexOra Password Reset Code",
      html: `
        <h2>Password Reset Request</h2>
        <p>Use the code below to reset your password:</p>
        <h1 style="color:#00ff88;">${resetCode}</h1>
        <p>This code expires in <b>10 minutes</b>.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Password reset code sent successfully!",
    });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send reset code." });
  }
};

/* 🔄 RESET PASSWORD — Verify code and update password */
export const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    console.log("\n🟢 [RESET PASSWORD]");
    console.log("Email:", email);
    console.log("Reset Code:", resetCode);

    if (!email || !resetCode || !newPassword) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found for:", email);
      return res.status(404).json({ message: "User not found." });
    }

    if (user.resetCode !== resetCode) {
      console.log("❌ Invalid reset code for:", email);
      return res.status(400).json({ message: "Invalid reset code." });
    }

    if (new Date() > user.resetCodeExpiresAt) {
      console.log("⏰ Reset code expired for:", email);
      return res.status(400).json({ message: "Reset code expired." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    await user.save();

    console.log("✅ Password reset successfully for:", email);

    res.status(200).json({
      success: true,
      message: "Password reset successful!",
    });
  } catch (err) {
    console.error("❌ Reset Password Error:", err.message);
    res.status(500).json({ success: false, message: "Password reset failed." });
  }
};

/* 🧩 AUTH MIDDLEWARE */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err.message);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

/* 🧑‍💼 PROFILE — Protected Route */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    console.error("❌ Profile Fetch Error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

/* 🧨 DANGER ZONE — Delete user account */
export const deleteAccount = async (req, res) => {
  try {
    console.log("\n🧨 [DELETE ACCOUNT REQUEST]");
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({ message: "User not found." });
    }

    await user.deleteOne();

    console.log("🚮 Account deleted successfully:", user.email);

    res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (err) {
    console.error("❌ Delete Account Error:", err.message);
    res.status(500).json({ message: "Server error deleting account." });
  }
};

/* 📧 Helper: Send email using Resend API with full logging */
async function sendEmail({ to, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("🚨 Missing RESEND_API_KEY in environment variables!");
      return;
    }

    const payload = {
      from: "NexOra <onboarding@resend.dev>",
      to,
      subject,
      html,
    };

    console.log("📦 Sending email to:", to);
    const result = await resend.emails.send(payload);
    console.log("✅ Email sent successfully:", result);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    if (err.response) console.error("📨 Resend API Response:", err.response);
  }
}
