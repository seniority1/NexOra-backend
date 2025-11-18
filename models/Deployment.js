import mongoose from "mongoose";

const DeploymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ownerNumber: { type: String, required: true },
  plan: { type: Number, required: true }, // coins cost
  status: { type: String, default: "stopped" }, // running | stopped
  folderName: { type: String }, // bot folder
  expiryDate: { type: Date }, // when bot auto stops
}, { timestamps: true });

export default mongoose.model("Deployment", DeploymentSchema);
