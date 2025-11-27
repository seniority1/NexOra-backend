import express from "express";
import { adminLogin } from "../controllers/adminController.js";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

router.post("/login", adminLogin);

// Protected admin example
router.get("/me", verifyAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

export default router;
