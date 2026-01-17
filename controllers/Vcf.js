const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory store for active sessions
let activeSessions = {}; 

/**
 * @desc Initialize a new Gainer Pool
 */
exports.createPool = async (req, res) => {
    try {
        const { name, duration } = req.body;

        const currentActiveCount = Object.keys(activeSessions).length;
        if (currentActiveCount >= 5) {
            return res.status(400).json({ success: false, message: "Engine Limit Reached: 5 Slots Max" });
        }

        const sessionId = uuidv4().substring(0, 8);
        
        activeSessions[sessionId] = {
            id: sessionId,
            name: name,
            startTime: Date.now(),
            duration: parseInt(duration) * 60 * 1000,
            participants: [],
            status: 'active',
            vcfData: null // Will hold the final string
        };

        // Auto-Termination
        setTimeout(() => {
            terminatePool(sessionId, req.app.get('socketio'));
        }, activeSessions[sessionId].duration);

        res.status(200).json({ success: true, sessionId });
    } catch (error) {
        res.status(500).json({ success: false, message: "Engine Initialization Error" });
    }
};

/**
 * @desc Check for duplicate phone numbers
 */
exports.checkDuplicate = (req, res) => {
    const { phone, sessionId } = req.body;
    const session = activeSessions[sessionId];
    if (!session) return res.status(404).json({ exists: false });

    const exists = session.participants.some(p => p.phone === phone);
    res.json({ exists });
};

/**
 * @desc Add user to pool
 */
exports.joinPool = (req, res) => {
    const { name, phone, sessionId } = req.body;
    const session = activeSessions[sessionId];

    if (!session || session.status !== 'active') {
        return res.status(404).json({ message: "Pool expired or invalid" });
    }

    const isDuplicate = session.participants.some(p => p.phone === phone);
    if (isDuplicate) return res.status(400).json({ message: "Already in pool" });

    session.participants.push({ name, phone, joinedAt: new Date() });

    // Live update to Creator Dashboard
    const io = req.app.get('socketio');
    if (io) {
        io.emit('gainerUpdate', {
            sessionId: sessionId,
            count: session.participants.length
        });
    }

    res.status(200).json({ success: true });
};

/**
 * @desc Get Live Participant List
 */
exports.getParticipantList = (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions[sessionId];
    if (!session) return res.json([]);
    res.json(session.participants);
};

/**
 * @desc Internal Function: Generate VCF String and Terminate
 */
function terminatePool(sessionId, io) {
    const session = activeSessions[sessionId];
    if (!session) return;

    console.log(`[NexOra Engine] Compiling VCF for: ${session.name}`);

    // Build VCF Content
    let vcfContent = "";
    session.participants.forEach((user, index) => {
        vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:NexOra ${index + 1} ${user.name}\nTEL;TYPE=CELL:${user.phone}\nEND:VCARD\n`;
    });

    session.vcfData = vcfContent;
    session.status = 'completed';

    // Notify the Creator page that the session is done
    if (io) {
        io.emit('sessionTerminated', { sessionId, name: session.name });
    }

    // Keep completed session in memory for 1 hour so the creator can download it
    setTimeout(() => {
        delete activeSessions[sessionId];
        console.log(`[NexOra Engine] Slot ${sessionId} cleared.`);
    }, 60 * 60 * 1000); 
}
