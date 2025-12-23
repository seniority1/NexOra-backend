import Notification from "../models/Notification.js";

// SEND NOTIFICATION (Updated for Targeting)
export const sendNotification = async (req, res) => {
  try {
    const { title, message, targetUser } = req.body; // Added targetUser
    
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: req.admin.email,
      targetUser: targetUser?.trim() || "", // Now saves correctly!
    });

    // We removed the global.io.emit because it's bell-only now.
    
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

// GET ALL (Admin View)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, total: notifications.length, notifications });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
