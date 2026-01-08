import Message from "../models/Message.js";

// 🚀 Save a new contact message
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
    console.error("NexOra Save Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// 📥 Fetch all messages (God Mode Feed)
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    return res.status(200).json(messages);
  } catch (error) {
    console.error("NexOra Fetch Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// 🗑️ DELETE a specific message (By ID)
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params; 
    const deletedMessage = await Message.findByIdAndDelete(id);

    if (!deletedMessage) {
      return res.status(404).json({ error: "Message record not found" });
    }

    return res.status(200).json({ success: true, message: "Record wiped from engine" });
  } catch (error) {
    console.error("NexOra Delete Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🧹 WIPE ALL messages (Bulk Cleanup for NexOra Optimization)
export const wipeAllMessages = async (req, res) => {
  try {
    // deleteMany({}) targets every document in the collection
    const result = await Message.deleteMany({});
    
    return res.status(200).json({ 
      success: true, 
      message: `NexOra Engine Optimized: ${result.deletedCount} records purged.` 
    });
  } catch (error) {
    console.error("NexOra Bulk Wipe Error:", error);
    return res.status(500).json({ error: "Bulk wipe failed to execute" });
  }
};
