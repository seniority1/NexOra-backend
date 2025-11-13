import fetch from "node-fetch";
import User from "../models/User.js";

// 💰 Verify payment and credit coins
export const verifyAndCreditCoins = async (req, res) => {
  try {
    const { email, coins, transaction_id } = req.body;

    if (!email || !transaction_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    console.log("💳 Verifying Flutterwave transaction:", transaction_id);

    // Verify transaction with Flutterwave API
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData = await verifyRes.json();
    console.log("✅ Flutterwave response:", verifyData);

    if (
      verifyData.status !== "success" ||
      verifyData.data.status !== "successful"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or failed transaction",
      });
    }

    // Update user's coin balance
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.coins = (user.coins || 0) + parseInt(coins);
    await user.save();

    console.log(`🪙 ${coins} coins added to ${email}`);

    res.json({
      success: true,
      message: "Coins credited successfully",
      newCoins: user.coins,
    });
  } catch (err) {
    console.error("❌ Payment verification error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error verifying payment",
    });
  }
};
