import express from "express";
import { saveMessage } from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact/  ← note: just "/" here
router.post("/", saveMessage);

export default router;
