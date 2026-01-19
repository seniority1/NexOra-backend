import express from 'express';
const router = express.Router();

// ✅ Correct ESM Import for the controller
import * as vcfController from '../controllers/vcfController.js'; 

// ✅ Importing Models
import Session from '../models/Session.js';
import Participant from '../models/Participants.js';

/**
 * 1. BOSS ROUTES (Command Center)
 */
router.post('/create', vcfController.createSession);

router.get('/active-sessions', async (req, res) => {
    try {
        const active = await Session.find({ status: 'active' });
        res.json(active);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/list/:sessionId', async (req, res) => {
    try {
        const list = await Participant.find({ sessionId: req.params.sessionId }).sort({ joinedAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


/**
 * 2. PARTICIPANT ROUTES (Join Page)
 */

// 🚀 ADD THIS NEW ROUTE HERE:
// This allows the join.html page to get the title and expiry time!
router.get('/session/:sessionId', vcfController.getSessionDetails);

router.post('/join', vcfController.joinSession);
router.get('/download/:sessionId', vcfController.downloadVcf);

export default router;
