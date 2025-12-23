import Notification from "../models/Notification.js";

// 📢 1. SEND BROADCAST OR PRIVATE MESSAGE
// Matches: router.post("/broadcast") in routes/admin.js
export const sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetUser } = req.body; 
    
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: req.admin?.email || "Admin", 
      targetUser: targetUser?.trim() || "", 
    });

    return res.json({
      success: true,
      message: notification.targetUser 
        ? `Private notification stored for ${notification.targetUser}` 
        : "Global notification stored for all members",
      notification,
    });
  } catch (err) {
    console.error("Send notification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// 📜 2. GET ALL NOTIFICATIONS (Admin History View)
// Matches: router.get("/notifications") in routes/admin.js
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).lean();
    return res.json({ 
      success: true, 
      total: notifications.length, 
      notifications 
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔔 3. GET USER NOTIFICATIONS (For the Dashboard Bell)
// This allows users to see Global + Private messages sent to them
export const getUserNotifications = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Finds notifications that are either for everyone ("") or specifically for this user
    const notifications = await Notification.find({
      $or: [
        { targetUser: "" }, 
        { targetUser: email }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching user notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};
