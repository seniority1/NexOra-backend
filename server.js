Update this correctlt and completely without skipping or breaking any code 


import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";
import referralRoutes from "./routes/referral.js";
import adminRoutes from "./routes/admin.js";
import botDeployRoutes from "./routes/botDeployRoutes.js";
import contactRoutes from "./routes/contact.js";
import adminNotificationsRoutes from "./routes/adminNotifications.js";

import "./cron/dailyReport.js"; 
import Admin from "./models/Admin.js";
import User from "./models/User.js"; 
import Notification from "./models/Notification.js"; 
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

global.io = io;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bot", botDeployRoutes); 
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminNotificationsRoutes);

/**
 * 🕵️‍♂️ AUTOMATIC BACKGROUND WATCHER
 * Updated to fix Mongoose Validation Errors
 */
setInterval(async () => {
  try {
    const now = new Date();
    const activeUsers = await User.find({
      $or: [
        { "deployments.status": "active" },
        { coins: { $lte: 0 }, notifiedExpiry: false }
      ]
    });

    for (const user of activeUsers) {
      let userUpdated = false;

      // 1. Check for Expired Bots
      for (const bot of user.deployments) {
        if (bot.status === "active" && bot.expiresAt && now > new Date(bot.expiresAt)) {
          bot.status = "expired";
          userUpdated = true;

          if (user.preferences?.deployAlerts) {
            await Notification.create({
              title: "Bot Stopped",
              message: `🛑 Alert: Your bot "${bot.name}" has finished its deployment period.`,
              targetUser: user.email,
              sentBy: "NexOra System", // ✅ FIXED: Added required field
              readBy: []
            });
          }
        }
      }

      // 2. Check for Coin Expiry
      if (user.coins <= 0 && !user.notifiedExpiry) {
        user.notifiedExpiry = true;
        userUpdated = true;

        if (user.preferences?.txAlerts) {
          await Notification.create({
            title: "Coins Expired",
            message: "⚠️ Alert: Your NexOra coins have reached 0. Refill to resume deployments.",
            targetUser: user.email,
            sentBy: "NexOra System", // ✅ FIXED: Added required field
            readBy: []
          });
        }
      } else if (user.coins > 0 && user.notifiedExpiry) {
        user.notifiedExpiry = false; 
        userUpdated = true;
      }

      if (userUpdated) {
        await user.save();
      }
    }
  } catch (err) {
    console.error("❌ Background Watcher Error:", err.message);
  }
}, 60000);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.error("ADMIN_EMAIL and ADMIN_PASSWORD required in .env");
        process.exit(1);
      }

      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await new Admin({
        name: "Alphonsus Okoko",
        email: adminEmail,
        passwordHash: hash,
        allowedIPs: ["197.211.63.149"], 
        trustedDevices: [],
      }).save();

      console.log("Admin created + IP Whitelisted");
    } else {
      await Admin.updateOne(
        { email: adminEmail },
        { $addToSet: { allowedIPs: "197.211.63.149" } }
      );
      console.log("Hard-coded IP 197.211.63.149 confirmed in whitelist");
    }
  })
  .catch((err) => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`NexOra Backend + Socket.io LIVE on port ${PORT}`);
  console.log(`Watcher Engine ACTIVE — Monitoring Bots & Coins...`);
  console.log(`Admin IP locked to: 197.211.63.149`);
});
