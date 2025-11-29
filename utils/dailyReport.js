// utils/dailyReport.js
import User from "../models/User.js";
import { send } from "./teleAlert.js";  // we reuse the same send() function

export const sendDailyRevenueReport = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all successful purchases from yesterday
    const usersWithPurchases = await User.aggregate([
      {
        $match: {
          "transactions.type": "purchase",
          "transactions.date": { $gte: today, $lt: tomorrow }
        }
      },
      { $unwind: "$transactions" },
      {
        $match: {
          "transactions.type": "purchase",
          "transactions.date": { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$transactions.amountNGN" },     // you'll add this field soon
          totalCoinsSold: { $sum: "$transactions.amount" },
          purchaseCount: { $sum: 1 },
          purchasers: { $addToSet: "$email" },
          topEarner: { $max: { email: "$email", amount: "$transactions.amountNGN" } }
        }
      }
    ]);

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const referralsReleased = await User.countDocuments({
      "transactions.type": "reward",
      "transactions.date": { $gte: today, $lt: tomorrow }
    });

    const data = usersWithPurchases[0] || {
      totalRevenue: 0,
      totalCoinsSold: 0,
      purchaseCount: 0
    };

    await send(`
DAILY REVENUE REPORT — 8:00 AM

<b>Date:</b> ${today.toDateString()}
<b>Total Purchases:</b> ${data.purchaseCount}
<b>Total Revenue:</b> ₦${data.totalRevenue?.toLocaleString() || 0}
<b>NexCoins Sold:</b> ${data.totalCoinsSold?.toLocaleString() || 0}
<b>New Users:</b> ${newUsersToday}
<b>Referral Rewards Paid:</b> \( {referralsReleased} (+ \){(referralsReleased * 100).toLocaleString()} coins)

Empire grows richer while you slept
    `.trim());
  } catch (err) {
    console.log("Daily report failed:", err.message);
  }
};
