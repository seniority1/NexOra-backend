// cron/dailyReport.js
import cron from "node-cron";
import { sendDailyRevenueReport } from "../utils/dailyReport.js";

// Every day at 8:00 AM (Lagos time)
cron.schedule("0 8 * * *", () => {
  console.log("Sending daily revenue report...");
  sendDailyRevenueReport();
}, {
  timezone: "Africa/Lagos"
});

console.log("Daily 8AM revenue report scheduled");
