import User from "../models/User.js";

export const getReferralDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "referralCode pendingReferralCoins coins transactions"
    );

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Extract only referral-related transactions
    const referralTransactions = user.transactions.filter(
      (t) => t.type === "reward"
    );

    res.json({
      success: true,
      referralCode: user.referralCode,
      coins: user.coins,
      pendingReferralCoins: user.pendingReferralCoins,
      referralTransactions,
      referralLink: `https://nex0ra.netlify.app/register?ref=${user.referralCode}`,
    });
  } catch (err) {
    console.error("Referral dashboard error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error loading referral dashboard",
    });
  }
};
