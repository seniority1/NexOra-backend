// src/utils/dailyReport.js
import User from "../models/User.js";
import { send } from "./teleAlert.js";  // ← This will now work

export const sendDailyRevenueReport = async () => {
  try {
    // Midnight today (Lagos time already handled by server timezone)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Get all purchases from YESTERDAY
    const purchases = await User.aggregate([
      { $match: { "transactions.type": "purchase" } },
      { $unwind: "$transactions" },
      {
        $match: {
          "transactions.type": "purchase",
          "transactions.date": { $gte: startOfDay, $lt: startOfTomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$transactions.amountNGN", 0] } },
          totalCoinsSold: { $sum: "$transactions.amount" },
          purchaseCount: { $sum: 1 },
          uniqueBuyers: { $addToSet: "$email" }
        }
      }
    ]);

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lt: startOfTomorrow }
    });

    const referralRewardsToday = await User.countDocuments({
      "transactions.type": "reward",
      "transactions.date": { $gte: startOfDay, $lt: startOfTomorrow }
    });

    const stats = purchases[0] || {
      totalRevenue: 0,
      totalCoinsSold: 0,
      purchaseCount: 0,
      uniqueBuyers: []
    };

    await send(`
DAILY REVENUE REPORT — 8:00 AM

<b>Date:</b> ${startOfDay.toDateString()}
<b>Total Purchases:</b> ${stats.purchaseCount}
<b>Total Revenue:</b> ₦${(stats.totalRevenue || 0).toLocaleString()}
<b>NexCoins Sold:</b> ${(stats.totalCoinsSold || 0).toLocaleString()}
<b>Unique Buyers:</b> ${stats.uniqueBuyers.length}
<b>New Users:</b> ${newUsersToday}
<b>Referral Rewards Released:</b> \( {referralRewardsToday} (+ \){(referralRewardsToday * 100).toLocaleString()} coins)

Empire grows richer while you slept
    `.trim());

    console.log("Daily revenue report sent successfully");

  } catch (err) {
    console.error("Daily report failed:", err.message);
  }
};
