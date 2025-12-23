import Notification from "../models/Notification.js";

// 🔔 GET NOTIFICATIONS (Fetches both Global and Private)
export const getUserNotifications = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find notifications that are:
    // 1. Global (targetUser is empty/missing)
    // 2. OR Private (targetUser matches user's email)
    const notifications = await Notification.find({
      $or: [
        { targetUser: "" }, 
        { targetUser: { $exists: false } }, 
        { targetUser: email }
      ]
    }).sort({ createdAt: -1 }); // Newest first

    res.status(200).json(notifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ MARK NOTIFICATIONS AS READ
export const markNotificationsRead = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Adds the user's email to the 'readBy' array if it's not already there
    await Notification.updateMany(
      { 
        $or: [
          { targetUser: "" }, 
          { targetUser: { $exists: false } }, 
          { targetUser: email }
        ],
        readBy: { $ne: email } 
      },
      { $addToSet: { readBy: email } }
    );

    res.status(200).json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    console.error("❌ Error marking notifications read:", err);
    res.status(500).json({ message: "Server error" });
  }
};
  
