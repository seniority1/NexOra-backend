import User from "../models/User.js";

// 🧠 Get user info (dashboard)
export const getUserInfo = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select(
      "-password -verificationCode -codeExpiresAt"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      name: user.name,
      email: user.email,
      coins: user.coins,
      deployments: user.deployments,
      verified: user.verified,
      preferences: user.preferences, // Included for settings sync
    });
  } catch (err) {
    console.error("❌ Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 💰 Update coins + log transaction
export const updateCoins = async (req, res) => {
  try {
    const { email, amount, type, description } = req.body;

    if (!email || amount == null) {
      return res.status(400).json({ message: "Email and amount are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent negative coin balance
    const newBalance = user.coins + Number(amount);
    if (newBalance < 0) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Update balance
    user.coins = newBalance;

    // Log a transaction
    user.transactions.push({
      amount,
      type: type || (amount > 0 ? "purchase" : "spend"),
      description: description || "Balance update",
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Coin balance updated",
      coins: user.coins,
    });
  } catch (err) {
    console.error("❌ Error updating coins:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📜 Get transaction history
export const getTransactions = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("transactions");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      transactions: user.transactions.reverse(), // newest first
    });
  } catch (err) {
    console.error("Transaction History Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🚀 Add deployment
export const addDeployment = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res
        .status(400)
        .json({ message: "Email and deployment name required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newDeployment = { name, status: "active" };
    user.deployments.push(newDeployment);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Deployment added successfully",
      deployments: user.deployments,
    });
  } catch (err) {
    console.error("❌ Error adding deployment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ⚙️ Update User Preferences (NEW: For Settings Page)
export const updatePreferences = async (req, res) => {
  try {
    const { email, preferences } = req.body;

    if (!email || !preferences) {
      return res.status(400).json({ message: "Email and preferences required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update preferences object
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.status(200).json({
      success: true,
      message: "Preferences updated",
      preferences: user.preferences,
    });
  } catch (err) {
    console.error("❌ Error updating preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📱 Get Active Sessions (NEW: For Session Management)
export const getSessions = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("sessions");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      success: true,
      sessions: user.sessions,
    });
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🚪 Logout All Other Devices (NEW: For Session Management)
export const logoutOthers = async (req, res) => {
  try {
    const { email, currentToken } = req.body;

    if (!email || !currentToken) {
      return res.status(400).json({ message: "Email and current token required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Keep only the session that matches the current token
    user.sessions = user.sessions.filter((s) => s.token === currentToken);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Other sessions terminated successfully",
      sessions: user.sessions,
    });
  } catch (err) {
    console.error("❌ Error clearing sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
};
