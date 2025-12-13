import Notification from "../models/Notification.js";

// SEND NOTIFICATION
export const sendNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      sentBy: req.admin.email,
    });

    // Real-time delivery to all connected users
    global.io?.emit("newNotification", {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    return res.json({
      success: true,
      message: "Notification sent successfully",
      notification,
    });
  } catch (err) {
    console.error("Send notification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET ALL NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      total: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
