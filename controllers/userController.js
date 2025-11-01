import User from "../models/user.js";

// 🧠 Get user info (for dashboard)
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
      coins: user.coins,
      deployments: user.deployments,
      verified: user.verified,
    });
  } catch (err) {
    console.error("❌ Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 💰 Update coin balance (e.g., after purchase)
export const updateCoins = async (req, res) => {
  try {
    const { email, amount, type, description } = req.body;

    if (!email || amount == null) {
      return res.status(400).json({ message: "Email and amount are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent negative balances
    const newBalance = user.coins + Number(amount);
    if (newBalance < 0) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Update balance
    user.coins = newBalance;

    // Log transaction
    user.transactions.push({
      amount,
      type: type || (amount > 0 ? "purchase" : "spend"),
      description: description || "Balance update",
    });

    await user.save();

    res.status(200).json({
      message: "Coin balance updated",
      coins: user.coins,
    });
  } catch (err) {
    console.error("❌ Error updating coins:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🚀 Optional: Add a new deployment
export const addDeployment = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ message: "Email and deployment name required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newDeployment = { name, status: "active" };
    user.deployments.push(newDeployment);
    await user.save();

    res.status(200).json({
      message: "Deployment added successfully",
      deployments: user.deployments,
    });
  } catch (err) {
    console.error("❌ Error adding deployment:", err);
    res.status(500).json({ message: "Server error" });
  }
};
