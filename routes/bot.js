import express from "express";
import mongoose from "mongoose";

// Example Bot model (you can replace with your actual schema)
const botSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: "offline" },
  createdAt: { type: Date, default: Date.now },
});

const Bot = mongoose.models.Bot || mongoose.model("Bot", botSchema);

const router = express.Router();

// ------------------------------
// GET all bots
router.get("/", async (req, res) => {
  try {
    const bots = await Bot.find();
    res.json({ success: true, bots });
  } catch (err) {
    console.error("Error fetching bots:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------------------
// POST create new bot
router.post("/create", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Bot name required" });

    const newBot = new Bot({ name, status: "online" });
    await newBot.save();

    // Broadcast to all connected Socket.io clients
    if (global.io) {
      global.io.emit("bot-created", { id: newBot._id, name: newBot.name });
    }

    res.json({ success: true, bot: newBot });
  } catch (err) {
    console.error("Error creating bot:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------------------
// PATCH update bot status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const bot = await Bot.findByIdAndUpdate(id, { status }, { new: true });
    if (!bot) return res.status(404).json({ success: false, message: "Bot not found" });

    // Notify all clients
    if (global.io) global.io.emit("bot-updated", bot);

    res.json({ success: true, bot });
  } catch (err) {
    console.error("Error updating bot:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
