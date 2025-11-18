import mongoose from "mongoose";

const DeploymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerNumber: { type: String, required: true },
    plan: { type: Number, required: true },
    status: { type: String, default: "starting" },
    folderName: { type: String, required: true },
    expiryDate: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Deployment", DeploymentSchema);
