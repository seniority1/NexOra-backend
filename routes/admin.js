import express from "express";
import { adminLogin, getAllUsers, addCoins,  } from "../controllers/adminController.js";
import verifyAdmin from "../middleware/verifyAdmin.js";
import { getGiftedUsers } from "../controllers/adminController.js";
import { banUser, unbanUser } from "../controllers/adminController.js";
import { getSecurityLogs } from "../controllers/adminController.js";

const router = express.Router();

// Admin Login
router.post("/login", adminLogin);

// Verify admin session
router.get("/me", verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Fetch all users (protected)
router.get("/users", verifyAdmin, getAllUsers);

// Add coins to a user (protected)
router.post("/add-coins", verifyAdmin, addCoins);

router.get("/gifted", verifyAdmin, getGiftedUsers);

router.post("/ban", verifyAdmin, banUser);
router.post("/unban", verifyAdmin, unbanUser);

// ... your existing routes ...

router.get("/security", verifyAdmin, getSecurityLogs);
           



export default router;
