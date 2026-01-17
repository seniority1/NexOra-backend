const express = require('express');
const router = express.Router();
const gainerController = require('../controllers/gainerController');
const { authMiddleware } = require('../middleware/auth'); // Ensure only logged in users create sessions

// Creator Routes
router.post('/create', authMiddleware, gainerController.createSession);

// Public Routes (No login required)
router.get('/session/:sessionId', gainerController.getSessionDetails);
router.post('/join', gainerController.joinSession);

module.exports = router;
