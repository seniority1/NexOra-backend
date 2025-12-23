import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  sentBy: { 
    type: String, 
    required: true 
  }, // Admin email
  
  /** * TARGET USER LOGIC:
   * Empty string ("") = Broadcast to everyone.
   * Specific email (e.g., "user@gmail.com") = Only that user sees it.
   */
  targetUser: { 
    type: String, 
    default: "" 
  }, 

  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  /** * Track which users have opened the notification.
   * Storing emails here matches your dashboard's localStorage logic.
   */
  readBy: [{ 
    type: String 
  }], 
});

export default mongoose.model("Notification", NotificationSchema);
