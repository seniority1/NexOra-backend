import express from "express";
import { deployBotToVPS } from "../controllers/botDeployController.js";

const router = express.Router();

router.post("/deploy", deployBotToVPS);

export default router;
