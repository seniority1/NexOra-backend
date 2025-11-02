import User from "../models/user.js";

// 🧠 Get user info for dashboard
export const getUserInfo = async (req, res) => {
  try {
    const { email } = req.query; // frontend will send ?email=user@example.com

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("-password -verificationCode -codeExpiresAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      name: user.name,
      email: user.email,
      verified: user.verified,
    });
  } catch (err) {
    console.error("❌ Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
};
