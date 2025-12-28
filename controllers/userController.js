import User from "../models/User.js";
import Notification from "../models/Notification.js";

// 🛡️ Helper: Creates a private notification ONLY if the specific toggle is ON
const createPrivateNotification = async (user, type, message) => {
  try {
    if (user.preferences && user.preferences[type] === true) {
      await Notification.create({
        title: "NexOra System",
        message: message,
        targetUser: user.email,
        sentBy: "NexOra System", // ✅ Fixed: Added required field from Notification model
        readBy: []
      });
      console.log(`🔔 Notification created for ${user.email} (Type: ${type})`);
    }
  } catch (err) {
    console.error("❌ Notification Helper Error:", err.message);
  }
};

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
      preferences: user.preferences, 
    });
  } catch (err) {
    console.error("❌ Error fetching user info:", err.message);
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

    const newBalance = user.coins + Number(amount);
    if (newBalance < 0) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ✅ Enum Guard: Ensure type matches User model ["purchase", "spend", "reward"]
    const allowedTypes = ["purchase", "spend", "reward"];
    let finalType = type || (amount > 0 ? "purchase" : "spend");
    if (!allowedTypes.includes(finalType)) {
      finalType = amount > 0 ? "purchase" : "spend";
    }

    user.coins = newBalance;

    user.transactions.push({
      amount,
      type: finalType,
      description: description || "Balance update",
    });

    await user.save();

    // 📣 EXECUTION: Trigger alert if balance hits zero
    if (user.coins <= 0) {
      await createPrivateNotification(user, 'txAlerts', "⚠️ Alert: Your NexOra coins have expired!");
    } else if (amount > 0) {
      await createPrivateNotification(user, 'txAlerts', `💎 Success: ${amount} coins added to your account.`);
    }

    res.status(200).json({
      success: true,
      message: "Coin balance updated",
      coins: user.coins,
    });
  } catch (err) {
    console.error("❌ Error updating coins:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
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
      transactions: user.transactions.reverse(),
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

    // 📣 EXECUTION: Trigger deployment alert automatically
    await createPrivateNotification(user, 'deployAlerts', `🚀 Bot Deployed: Your bot "${name}" is now active!`);

    res.status(200).json({
      success: true,
      message: "Deployment added successfully",
      deployments: user.deployments,
    });
  } catch (err) {
    console.error("❌ Error adding deployment:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ⚙️ Update User Preferences
export const updatePreferences = async (req, res) => {
  try {
    const { email, preferences } = req.body;

    if (!email || !preferences) {
      return res.status(400).json({ message: "Email and preferences required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.status(200).json({
      success: true,
      message: "Preferences updated",
      preferences: user.preferences,
    });
  } catch (err) {
    console.error("❌ Error updating preferences:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 📱 Get Active Sessions
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
    console.error("❌ Error fetching sessions:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🚪 Logout All Other Devices
export const logoutOthers = async (req, res) => {
  try {
    const { email, currentToken } = req.body;

    if (!email || !currentToken) {
      return res.status(400).json({ message: "Email and current token required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.sessions = user.sessions.filter((s) => s.token === currentToken);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Other sessions terminated successfully",
      sessions: user.sessions,
    });
  } catch (err) {
    console.error("❌ Error clearing sessions:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
