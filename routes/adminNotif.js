import express from "express";
import UserNotif from "../models/UserNotif.js";
import authMiddleware from "../middleware/authMiddleware.js"; // make sure only admins can send

const router = express.Router();

// POST /api/admin/notify
router.post("/notify", authMiddleware, async (req, res) => {
  const { title, message, recipientEmail } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message required" });
  }

  try {
    let recipients = [];

    if (recipientEmail) {
      // send to a specific user
      recipients.push(recipientEmail.toLowerCase());
    } else {
      // send to all users
      const users = await import("../models/User.js").then(m => m.default.find({}));
      recipients = users.map(u => u.email);
    }

    // save notification for each recipient
    const notifPromises = recipients.map(email =>
      UserNotif.create({ title, message, recipientEmail: email })
    );
    const notifications = await Promise.all(notifPromises);

    res.status(201).json({
      success: true,
      count: notifications.length,
      message: `Notification sent to ${recipientEmail || "all users"}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
