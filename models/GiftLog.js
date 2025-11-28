import mongoose from "mongoose";

const giftLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  adminNote: { type: String },  // Optional note from admin
});

const GiftLog = mongoose.model("GiftLog", giftLogSchema);
export default GiftLog;
