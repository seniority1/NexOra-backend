import User from "../models/User.js";
import Bot from "../models/Bot.js";

// 🧠 GET USER INFO (Profile & Coins)
export const getUserInfo = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      name: user.name,
      email: user.email,
      coins: user.coins || 0,
      referralCode: user.referralCode,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 💰 UPDATE COINS (When user buys/spends)
export const updateCoins = async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { $inc: { coins: amount } },
      { new: true }
    );
    res.json({ success: true, newBalance: user.coins });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

// 🚀 ADD DEPLOYMENT (Tracked in DB)
export const addDeployment = async (req, res) => {
  try {
    const { email, botType, phoneNumber } = req.body;
    const newBot = await Bot.create({
      ownerEmail: email,
      botType,
      phoneNumber,
      status: "online",
      createdAt: new Date(),
    });
    res.json({ success: true, bot: newBot });
  } catch (err) {
    res.status(500).json({ message: "Deployment tracking failed" });
  }
};

// 📜 GET TRANSACTION HISTORY
export const getTransactions = async (req, res) => {
  try {
    const { email } = req.query;
    // Assuming you have a Transaction model, or tracking them in User
    const user = await User.findOne({ email }).select("transactions");
    res.json(user?.transactions || []);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch history" });
  }
};
