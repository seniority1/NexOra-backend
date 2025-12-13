import express from "express";
import UserNotif from "../models/UserNotif.js";

const router = express.Router();

// POST /api/admin/notify
router.post("/notify", async (req, res) => {
  const { title, message, recipientEmail } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message required" });

  try {
    const notification = await UserNotif.create({
      title,
      message,
      recipientEmail: recipientEmail || null, // null = broadcast
    });
    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
