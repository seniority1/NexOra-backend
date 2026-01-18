const express = require('express');
const router = express.Router();
// Correct path to your controller
const vcfController = require('../controllers/vcfController'); 

// Boss Routes
router.post('/create', vcfController.createSession);
router.get('/active-sessions', async (req, res) => {
    // Helper to get active sessions for the Dashboard Grid
    const Session = require('../models/Session');
    const active = await Session.find({ status: 'active' });
    res.json(active);
});

// Participant Routes
router.post('/join', vcfController.joinSession);
router.get('/list/:sessionId', async (req, res) => {
    const Participant = require('../models/Participants'); // Matches your filename
    const list = await Participant.find({ sessionId: req.params.sessionId });
    res.json(list);
});

// Download Route
router.get('/download/:sessionId', vcfController.downloadVcf);

module.exports = router;
