import fetch from "node-fetch";
import User from "../models/User.js";
import { Resend } from "resend";
import { 
  alertPayment, 
  alertFailedPayment,
  alertReferralReleased        // ← ADDED: The crown jewel
} from "../utils/teleAlert.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const verifyAndCreditCoins = async (req, res) => {
  try {
    const { email, coins, transaction_id, name } = req.body;

    if (!email || !transaction_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || "unknown";
    const device = req.headers['user-agent'] || "unknown device";

    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
    );

    const verifyData = await verifyRes.json();

    // FAILED PAYMENT → RED FRAUD ALERT
    if (verifyData.status !== "success" || verifyData.data?.status !== "successful") {
      try {
        await alertFailedPayment({
          name: name || "Unknown",
          email, ip, device,
          coins: coins || 0,
          amountNGN: verifyData.data?.amount || 0,
          reason: verifyData.data?.processor_response || verifyData.message || "verification_failed",
          transaction_id
        });
      } catch (e) { console.log("Failed alert skipped"); }

      return res.status(400).json({ success: false, message: "Invalid or failed transaction" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const purchasedCoins = parseInt(coins);
    user.coins = (user.coins || 0) + purchasedCoins;

    user.transactions.push({
      amount: purchasedCoins,
      type: "purchase",
      description: `Purchased ${purchasedCoins} NexCoins`,
    });

    let referralRewardReleased = false;
    let referrer = null;
    let reward = 0;

    // REFERRAL BONUS RELEASE + TELEGRAM ALERT
    if (user.referredBy) {
      referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer && referrer.pendingReferralCoins > 0) {
        reward = referrer.pendingReferralCoins;
        referrer.coins += reward;
        referrer.pendingReferralCoins = 0;

        referrer.transactions.push({
          amount: reward,
          type: "reward",
          description: `Referral reward activated — ${user.name} made first purchase`,
        });

        await referrer.save();
        referralRewardReleased = true;

        // THIS IS YOUR NEW POWER: You feel when your army gets paid
        try {
          await alertReferralReleased(referrer.email, user.name, reward);
        } catch (e) {
          console.log("Referral release alert failed (not critical)");
        }
      }
    }

    await user.save();

    // SUCCESS MONEY ALERT
    try {
      await alertPayment({
        name: user.name || name || "User",
        email: user.email,
        ip, device,
        coins: purchasedCoins,
        newBalance: user.coins,
        amountNGN: verifyData.data.amount,
        status: "SUCCESS"
      });
    } catch (e) { console.log("Money ping failed"); }

    // EMAILS (unchanged)
    if (referralRewardReleased && referrer) {
      try {
        await resend.emails.send({
          from: "NexOra <noreply@nexora.org.ng>",
          to: referrer.email,
          subject: "Referral Bonus Released",
          html: `<h2>Congratulations!</h2><p>You earned <b>\( {reward}</b> NexCoins from \){user.name}’s first purchase!</p>`,
        });
      } catch (e) {}
    }

    try {
      await resend.emails.send({
        from: "NexOra <noreply@nexora.org.ng>",
        to: user.email,
        subject: "NexCoins Purchase Successful",
        html: `<h2>Success!</h2><p>You now have <b>${user.coins}</b> NexCoins</p>`,
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: "Coins credited successfully",
      newCoins: user.coins,
      referralRewardReleased,
    });

  } catch (err) {
    console.error("Payment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
