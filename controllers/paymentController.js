import fetch from "node-fetch";
import User from "../models/User.js";
import { Resend } from "resend";
import { alertPayment } from "../utils/teleAlert.js";  // ← THE GOLDEN LINE

const resend = new Resend(process.env.RESEND_API_KEY);

export const verifyAndCreditCoins = async (req, res) => {
  try {
    const { email, coins, transaction_id } = req.body;

    if (!email || !transaction_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

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

    if (
      verifyData.status !== "success" ||
      verifyData.data.status !== "successful"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or failed transaction",
      });
    }

    // FIND USER
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

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

    // GET REAL IP & DEVICE
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || "unknown";
    const device = req.headers['user-agent'] || "unknown device";

    // ROYAL MONEY ALERT — THIS IS WHAT MAKES KINGS SMILE
    try {
      await alertPayment({
        name: user.name,
        email: user.email,
        ip,
        device,
        coins: purchasedCoins,
        newBalance: user.coins,
        amountNGN: verifyData.data.amount,  // actual Naira paid
        status: "SUCCESS"
      });
    } catch (e) {
      console.log("Money ping failed (but payment went through)");
    }

    // REFERRAL REWARD EMAIL (unchanged)
    if (referralRewardReleased && referrer) {
      try {
        await resend.emails.send({
          from: "NexOra <noreply@nexora.org.ng>",
          to: referrer.email,
          subject: "Referral Bonus Released",
          html: `<h2>Congratulations!</h2><p>You earned <b>${referrer.pendingReferralCoins}</b> NexCoins!</p>`,
        });
      } catch (emailErr) { console.error("Referral email failed:", emailErr.message); }
    }

    // PURCHASE EMAIL (unchanged)
    try {
      await resend.emails.send({
        from: "NexOra <noreply@nexora.org.ng>",
        to: user.email,
        subject: "NexCoins Purchase Successful",
        html: `<h2>Purchase Successful!</h2><p>You now have <b>${user.coins}</b> NexCoins</p>`,
      });
    } catch (emailErr) { console.error("Purchase email failed:", emailErr.message); }

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
