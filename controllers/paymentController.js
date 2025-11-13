// controllers/paymentController.js
import fetch from "node-fetch";
import User from "../models/User.js";

// 🪙 Verify payment & credit coins
export const verifyAndCreditCoins = async (req, res) => {
  try {
    const { email, coins, transaction_id } = req.body;

    console.log("💰 [VERIFY PAYMENT]", { email, coins, transaction_id });

    if (!email || !transaction_id)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    // 1️⃣ Verify with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, // your secret key in .env
        },
      }
    );

    const data = await response.json();
    console.log("✅ Flutterwave verify response:", data);

    if (data.status !== "success" || data.data.status !== "successful") {
      return res.status(400).json({ success: false, message: "Invalid or failed transaction" });
    }

    // 2️⃣ Update user's coins
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.coins = (user.coins || 0) + parseInt(coins);
    await user.save();

    console.log(`🪙 ${coins} coins added to ${email}`);

    res.json({
      success: true,
      message: "Coins credited successfully",
      newCoins: user.coins,
    });
  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ success: false, message: "Server error verifying payment" });
  }
};
