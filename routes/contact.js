import express from "express";
import { saveMessage, getMessages } from "../controllers/contactController.js";

// GET /api/contact/ (fetch all messages)
router.get("/", getMessages);

// POST /api/contact/  ← note: just "/" here
router.post("/", saveMessage);

export default router;
