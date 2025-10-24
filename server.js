import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();

// ✅ Allow frontend requests from Netlify
app.use(
  cors({
    origin: ["https://nexora-ng.netlify.app", "https://nexora-frontend.netlify.app", "*"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("🚀 NexOra backend is running!"));

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
