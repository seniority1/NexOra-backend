import Notification from "../models/Notification.js";

// 📢 SEND BROADCAST (Renamed to match routes/admin.js)
export const sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetUser } = req.body; 
    
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: req.admin.email, // Ensure verifyAdmin middleware provides this
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

// 📜 GET ALL NOTIFICATIONS (Renamed to match routes/admin.js)
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
