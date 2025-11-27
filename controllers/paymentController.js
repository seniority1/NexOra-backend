import fetch from "node-fetch";
import User from "../models/User.js";
import { Resend } from "resend";

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

    // 🔍 VERIFY PAYMENT FROM FLUTTERWAVE
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

    // 🔍 FIND USER
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 💰 CREDIT USER COINS
    const purchasedCoins = parseInt(coins);
    user.coins = (user.coins || 0) + purchasedCoins;

    user.transactions.push({
      amount: purchasedCoins,
      type: "purchase",
      description: `Purchased ${purchasedCoins} NexCoins`,
    });

    console.log("💰 User purchased coins:", user.email);

    let referralRewardReleased = false;

    // 🎁 REFERRAL BONUS RELEASE
    if (user.referredBy) {
      const referrer = await User.findOne({ referralCode: user.referredBy });

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
        console.log("🎉 Referral reward released to:", referrer.email);

        // ✉️ SEND REFERRAL REWARD EMAIL
        try {
          await resend.emails.send({
            from: "NexOra <noreply@nexora.org.ng>",
            to: referrer.email,
            subject: "Referral Bonus Released 🎉",
            html: `
              <h2>Congratulations!</h2>
              <p>Your referral <b>${user.name}</b> has made their first purchase.</p>
              <p>You have received <b>${reward} NexCoins</b> 🎁</p>
              <br>
              <p>Thanks for sharing NexOra ❤️</p>
            `,
          });
        } catch (emailErr) {
          console.error("Referral email failed:", emailErr.message);
        }
      }
    }

    await user.save();

    // ✉️ SEND PURCHASE EMAIL
    try {
      await resend.emails.send({
        from: "NexOra <noreply@nexora.org.ng>",
        to: user.email,
        subject: "NexCoins Purchase Successful 💰",
        html: `
          <h2>Your Purchase Was Successful!</h2>
          <p>You purchased <b>${purchasedCoins} NexCoins</b>.</p>
          <p>Your new balance: <b>${user.coins} coins</b></p>
          <br>
          <p>Thank you for using NexOra 🚀</p>
        `,
      });
    } catch (emailErr) {
      console.error("Purchase email failed:", emailErr.message);
    }

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
