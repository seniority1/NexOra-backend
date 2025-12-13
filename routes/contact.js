import express from "express";
import { saveMessage, getMessages } from "../controllers/contactController.js";

const router = express.Router(); // <-- Make sure this is here!

// POST /api/contact/  (to save a message)
router.post("/", saveMessage);

// GET /api/contact/  (to fetch all messages)
router.get("/", getMessages);

export default router;
