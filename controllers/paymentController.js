import fetch from "node-fetch";
import User from "../models/User.js";

export const verifyAndCreditCoins = async (req, res) => {
  try {
    const { email, coins, transaction_id } = req.body;

    if (!email || !transaction_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData = await verifyRes.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data.status !== "successful"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or failed transaction",
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.coins = (user.coins || 0) + parseInt(coins);
    await user.save();

    res.json({
      success: true,
      message: "Coins credited successfully",
      newCoins: user.coins,
    });
  } catch (err) {
    console.error("Payment verification error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error verifying payment",
    });
  }
};
