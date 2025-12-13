// routes/adminNotif.js
import express from "express";
import UserNotif from "../models/UserNotif.js";
import authMiddleware from "../middleware/authMiddleware.js"; // Only admins

const router = express.Router();

// POST /api/admin/notifications
router.post("/notifications", authMiddleware, async (req, res) => {
  const { email, title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message required" });
  }

  try {
    let recipients = [];

    if (email) {
      recipients.push(email.toLowerCase());
    } else {
      const usersModule = await import("../models/User.js");
      const users = await usersModule.default.find({});
      recipients = users.map(u => u.email);
    }

    const notifPromises = recipients.map(e =>
      UserNotif.create({ title, message, recipientEmail: e })
    );

    await Promise.all(notifPromises);

    res.status(201).json({ success: true, message: `Notification sent to ${email || "all users"}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
