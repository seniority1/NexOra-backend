import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  sentBy: { type: String, required: true }, // admin email
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // track users who read it
});

export default mongoose.model("Notification", NotificationSchema);
