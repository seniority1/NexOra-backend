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

// MongoDB Connection + Smart Security Setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    // ——— 1. AUTO-CREATE ADMIN (ONE TIME) ———
    const existingAdmin = await Admin.findOne();

    if (!existingAdmin) {
      const defaultEmail = process.env.ADMIN_EMAIL;
      const defaultPassword = process.env.ADMIN_PASSWORD;

      if (!defaultEmail || !defaultPassword) {
        console.error("ADMIN_EMAIL or ADMIN_PASSWORD missing in env");
      } else {
        const hash = await bcrypt.hash(defaultPassword, 12);
        const admin = new Admin({
          name: "Main Admin",
          email: defaultEmail,
          passwordHash: hash,
        });
        await admin.save();
        console.log("ADMIN ACCOUNT CREATED:", defaultEmail);
      }
    } else {
      console.log("Admin already exists, skipping creation");
    }

    // ——— 2. AUTO-SECURE ADMIN ON EVERY DEPLOY (YOUR REQUEST) ———
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail) {
      try {
        // Get current public IP (works on Render, Railway, etc.)
        const ipResponse = await fetch("https://api.ipify.org");
        const currentIP = await ipResponse.text();

        const admin = await Admin.findOne({ email: adminEmail });
        if (admin && currentIP && !admin.allowedIPs.includes(currentIP)) {
          await Admin.updateOne(
            { email: adminEmail },
            { $addToSet: { allowedIPs: currentIP } } // $addToSet = no duplicates
          );
          console.log(`Auto-added current IP to whitelist: ${currentIP}`);
        }
      } catch (err) {
        console.warn("Could not auto-add IP (will try next startup):", err.message);
      }
    }
  })
  .catch((err) => console.error("MongoDB Error:", err));

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
