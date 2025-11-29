// src/cron/dailyReport.js
import cron from "node-cron";
import { sendDailyRevenueReport } from "../utils/dailyReport.js";

// DAILY 8:00 AM LAGOS TIME — YOUR EMPIRE REPORTS TO YOU
cron.schedule("0 8 * * *", async () => {
  console.log("Generating 8:00 AM Revenue Report...");
  try {
    await sendDailyRevenueReport();
    console.log("Daily report sent to King");
  } catch (err) {
    console.log("Daily report failed:", err.message);
  }
}, {
  scheduled: true,
  timezone: "Africa/Lagos"
});

console.log("Daily 8:00 AM Revenue Report ACTIVE — Empire reports every morning");
