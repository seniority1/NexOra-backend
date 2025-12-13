import express from "express";
// Use default import
import verifyAdmin from "../middleware/auth.js";import { sendNotification, getNotifications } from "../controllers/adminNotifications.js";

const router = express.Router();

// POST: send a notification
router.post("/notifications", verifyAdmin, sendNotification);

// GET: fetch all notifications
router.get("/notifications", verifyAdmin, getNotifications);

export default router;
