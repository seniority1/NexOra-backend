import express from "express";
import { saveMessage } from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact
router.post("/api/contact", saveMessage);

export default router;
