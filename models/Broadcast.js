import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  sentBy: { type: String, required: true },     // admin email
  sentAt: { type: Date, default: Date.now },
});

export default mongoose.model("Broadcast", broadcastSchema);
