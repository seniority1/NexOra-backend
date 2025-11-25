import User from "../models/User.js";

// 📄 Get Transaction History (Protected Route)
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id; // from middleware

    const user = await User.findById(userId).select("transactions");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      transactions: user.transactions.reverse(), // newest first
    });
  } catch (err) {
    console.error("Transaction History Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
