import bcrypt from "bcrypt";
import User from "../models/User.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**

🪄 REGISTER — Create new user and send verification code
*/
export const register = async (req, res) => {
try {
const { name, email, password } = req.body;
console.log("\n🟢 [REGISTER ATTEMPT]");
console.log("Name:", name);
console.log("Email:", email);
console.log("Password Length:", password?.length);

if (!name || !email || !password) {
console.log("❌ Missing required fields");
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
console.log("📨 Preparing verification email...");

await sendEmail({
to: email,
subject: "Your NexOra Verification Code",
html:   <h2>Welcome to NexOra, ${name}!</h2>   <p>Use the code below to verify your account:</p>   <h1 style="color:#00ff88;">${verificationCode}</h1>   <p>Code expires in <b>10 minutes</b>.</p>  ,
});

res.status(201).json({
success: true,
message: "Registration successful! Verification code sent to your email.",
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


/**

✅ VERIFY CODE
*/
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


/**

🔁 RESEND VERIFICATION CODE
*/
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
html:   <h2>Hello again!</h2>   <p>Here’s your new NexOra code:</p>   <h1 style="color:#00ff88;">${newCode}</h1>   <p>Expires in <b>10 minutes</b>.</p>  ,
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


/**

🔐 LOGIN
*/
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

console.log("✅ Login successful for:", email);
res.status(200).json({ success: true, message: "Login successful." });
} catch (err) {
console.error("❌ Login Error:", err.message);
res.status(500).json({ success: false, message: "Login failed." });
}
};


/**

🧠 FORGOT PASSWORD — Send reset code
*/
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
html:   <h2>Password Reset Request</h2>   <p>Use the code below to reset your password:</p>   <h1 style="color:#00ff88;">${resetCode}</h1>   <p>This code expires in <b>10 minutes</b>.</p>  ,
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


/**

🔄 RESET PASSWORD — Verify code and update password
*/
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


/**

📧 Helper: Send email using Resend API with full logging
*/
async function sendEmail({ to, subject, html }) {
try {
if (!process.env.RESEND_API_KEY) {
console.error("🚨 Missing RESEND_API_KEY in environment variables!");
return;
}

const payload = {
from: "NexOra onboarding@resend.dev",
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


