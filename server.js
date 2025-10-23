import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();

app.use(express.json());

// ⚙️ Connect routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("🚀 NexOra backend is running!"));

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
