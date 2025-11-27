import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";
import deployRoutes from "./routes/deploy.js";
import referralRoutes from "./routes/referral.js";
import adminRoutes from "./routes/admin.js";

import Admin from "./models/Admin.js";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/admin", adminRoutes);

// MongoDB Connection + ONE-TIME ADMIN SETUP + HARD-CODED IP
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

    // 1. Auto-create admin account (only once)
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.error("ADMIN_EMAIL and ADMIN_PASSWORD required in .env");
        process.exit(1);
      }

      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await new Admin({
        name: "Alphonsus Okoko",
        email: process.env.ADMIN_EMAIL,
        passwordHash: hash,
        allowedIPs: ["197.211.63.149"],        // ← HARD-CODED FOREVER
        trustedDevices: [],
      }).save();

      console.log("Admin created + IP 197.211.63.149 HARD-CODED");
    } else {
      // Ensure your IP is in the array even if admin already exists
      await Admin.updateOne(
        { email: adminEmail },
        { $addToSet: { allowedIPs: "197.211.63.149" } }
      );
      console.log("Hard-coded IP 197.211.63.149 confirmed in whitelist");
    }

    // NO MORE AUTO-IP FETCHING — REMOVED COMPLETELY
  })
  .catch((err) => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin IP locked to: 197.211.63.149`);
});
