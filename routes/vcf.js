import express from 'express';
const router = express.Router();

// Import the controller using ESM syntax
// (Ensure your controller is also updated or uses a compatible export)
import * as vcfController from '../controllers/vcfController.js';

// 1. POOL MANAGEMENT (For the Creator's Page)
// Initializes a new slot
router.post('/create', vcfController.createPool);

// Fetches the live list of names/numbers for the dashboard
router.get('/list/:sessionId', vcfController.getParticipantList);

// 2. PARTICIPANT ACTIONS (For the Join Page)
// The instant check to see if a number is already in the specific pool
router.post('/check-duplicate', vcfController.checkDuplicate);

// The final submission to join the pool
router.post('/join', vcfController.joinPool);

// 3. EXPORT
export default router;
