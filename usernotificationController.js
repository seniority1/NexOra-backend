import Notification from "../models/Notification.js";

// 1. FETCH NOTIFICATIONS (Filtered for the specific user)
export const getUserNotifications = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Logic: Find messages that are for EVERYONE ("") OR specifically for THIS EMAIL
    const notifications = await Notification.find({
      $or: [
        { targetUser: "" },      // Global
        { targetUser: email }    // Private
      ]
    }).sort({ createdAt: -1 });

    return res.json(notifications);
  } catch (err) {
    console.error("Error fetching user notifications:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// 2. MARK AS READ (Adds user email to the readBy array)
export const markNotificationsRead = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Update all notifications that this user hasn't read yet
    await Notification.updateMany(
      { 
        $or: [{ targetUser: "" }, { targetUser: email }],
        readBy: { $ne: email } // Only update if email is NOT already in the list
      },
      { $addToSet: { readBy: email } } // Add email to the array without duplicates
    );

    return res.json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    console.error("Error marking notifications read:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
