import express from "express";
import botRoutes from "./src/routes/botRoutes.js";

const app = express();
app.use(express.json());

app.use("/bot", botRoutes);

app.listen(3000, () => console.log("Server running"));
