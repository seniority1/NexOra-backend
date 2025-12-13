import express from "express";
import UserNotif from "../models/UserNotif.js";

const router = express.Router();

// GET /api/user/notifications?email=user@example.com
router.get("/", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const notifications = await UserNotif.find({
      $or: [{ recipientEmail: email }, { recipientEmail: null }],
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/notifications/mark-read
router.post("/mark-read", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    await UserNotif.updateMany(
      { $or: [{ recipientEmail: email }, { recipientEmail: null }] },
      { $addToSet: { readBy: email } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
