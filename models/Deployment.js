import mongoose from "mongoose";

const DeploymentSchema = new mongoose.Schema(
  {
    // The user who owns this bot slot
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    // Changed from ownerNumber to phoneNumber to match Controller
    phoneNumber: { 
      type: String, 
      required: true, 
      unique: true 
    },
    // Changed from plan to days to match Controller logic
    days: { 
      type: Number, 
      required: true 
    },
    // Current state: initializing, waiting_pairing, online, or offline
    status: { 
      type: String, 
      default: "initializing" 
    },
    // The 8-digit code sent back from the VPS
    pairingCode: { 
      type: String, 
      default: "" 
    },
    /**
     * 📶 CONNECTION QUALITY INDICATOR
     * Stores the response time (latency) in milliseconds
     */
    latency: {
      type: Number,
      default: 0
    },
    // Automatic expiration based on days purchased
    expiryDate: { 
      type: Date, 
      required: true 
    }
  },
  { timestamps: true }
);

// This ensures we can quickly find bots by phone number
DeploymentSchema.index({ phoneNumber: 1 });

export default mongoose.model("Deployment", DeploymentSchema);
