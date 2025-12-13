import mongoose from "mongoose";

const userNotifSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipientEmail: { type: String, default: null }, // null = broadcast
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: String }], // emails of users who have read
});

export default mongoose.model("UserNotif", userNotifSchema);
