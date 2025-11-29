import fetch from "node-fetch";
import User from "../models/User.js";
import { Resend } from "resend";
import { 
  alertPayment, 
  alertFailedPayment 
} from "../utils/teleAlert.js";  // ← BOTH LOADED UPFRONT = BULLETPROOF

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

    // GET IP & DEVICE ONCE (used in both success & failure)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || "unknown";
    const device = req.headers['user-agent'] || "unknown device";

    // VERIFY PAYMENT FROM FLUTTERWAVE
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData = await verifyRes.json();

    // FAILED PAYMENT → RED FRAUD ALERT
    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful"
    ) {
      try {
        await alertFailedPayment({
          name: name || "Unknown",
          email,
          ip,
          device,
          coins: coins || 0,
          amountNGN: verifyData.data?.amount || 0,
          reason: verifyData.data?.processor_response || verifyData.message || "verification_failed",
          transaction_id
        });
        console.log("FRAUD ATTEMPT BLOCKED & REPORTED:", email, ip);
      } catch (e) {
        console.log("Failed payment alert skipped (still blocked)");
      }

      return res.status(400).json({
        success: false,
        message: "Invalid or failed transaction",
      });
    }

    // SUCCESS PATH — FIND USER
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const purchasedCoins = parseInt(coins);
    const previousBalance = user.coins || 0;
    user.coins = previousBalance + purchasedCoins;

    user.transactions.push({
      amount: purchasedCoins,
      type: "purchase",
      description: `Purchased ${purchasedCoins} NexCoins`,
    });

    let referralRewardReleased = false;
    let referrer = null;

    // REFERRAL BONUS RELEASE
    if (user.referredBy) {
      referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer && referrer.pendingReferralCoins > 0) {
        const reward = referrer.pendingReferralCoins;
        referrer.coins += reward;
        referrer.pendingReferralCoins = 0;
        referrer.transactions.push({
          amount: reward,
          type: "reward",
          description: `Referral reward activated for inviting ${user.name}`,
        });
        await referrer.save();
        referralRewardReleased = true;
      }
    }

    await user.save();

    // SUCCESS → GREEN MONEY ALERT
    try {
      await alertPayment({
        name: user.name || name || "User",
        email: user.email,
        ip,
        device,
        coins: purchasedCoins,
        newBalance: user.coins,
        amountNGN: verifyData.data.amount,
        status: "SUCCESS"
      });
      console.log("MONEY INCOMING — Empire grows richer");
    } catch (e) {
      console.log("Money ping failed (payment still processed)");
    }

    // EMAILS (unchanged)
    if (referralRewardReleased && referrer) {
      try {
        await resend.emails.send({
          from: "NexOra <noreply@nexora.org.ng>",
          to: referrer.email,
          subject: "Referral Bonus Released",
          html: `<h2>Congratulations!</h2><p>You earned <b>${reward}</b> NexCoins!</p>`,
        });
      } catch (e) {}
    }

    try {
      await resend.emails.send({
        from: "NexOra <noreply@nexora.org.ng>",
        to: user.email,
        subject: "NexCoins Purchase Successful",
        html: `<h2>Purchase Successful!</h2><p>You now have <b>${user.coins}</b> NexCoins</p>`,
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: "Coins credited successfully",
      newCoins: user.coins,
      referralRewardReleased,
    });

  } catch (err) {
    console.error("Payment verification error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error verifying payment",
    });
  }
};
