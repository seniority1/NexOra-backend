import Message from "../models/Message.js";

// Save a new contact message
export const saveMessage = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    return res.status(200).json({ message: "Message saved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};
