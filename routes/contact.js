import express from "express";
import { saveMessage, getMessages, deleteMessage } from "../controllers/contactController.js";

const router = express.Router(); 

/**
 * @route   POST /api/contact/
 * @desc    Save a new contact message from the frontend form
 */
router.post("/", saveMessage);

/**
 * @route   GET /api/contact/
 * @desc    Fetch all messages for the NexOra Admin Panel
 */
router.get("/", getMessages);

/**
 * @route   DELETE /api/contact/:id
 * @desc    Wipe a specific message record by its MongoDB ID
 */
router.delete("/:id", deleteMessage);

export default router;
