import express from "express";
import verifyAdmin from "../middleware/auth.js"; 

// 🚀 FIXED: Importing the exact names from your adminNotifications controller
import { 
  sendBroadcast, 
  getAllNotifications 
} from "../controllers/adminNotifications.js"; 

const router = express.Router();

/**
 * These endpoints are mounted under /api/admin in your server.js
 */

// POST: Dispatch a notification (Global or Private)
// URL: /api/admin/broadcast
router.post("/broadcast", verifyAdmin, sendBroadcast);

// GET: Fetch the notification history
// URL: /api/admin/notifications
router.get("/notifications", verifyAdmin, getAllNotifications);

export default router;
