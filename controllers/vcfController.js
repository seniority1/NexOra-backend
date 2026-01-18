const Session = require('../models/Session'); // Your session schema
const Participant = require('../models/Participant'); // Your participant schema
const { v4: uuidv4 } = require('uuid');

/**
 * 1. Initialize a New VCF Session (The Boss/Creator)
 */
exports.createSession = async (req, res) => {
    try {
        const { name, duration } = req.body;
        const sessionId = uuidv4().substring(0, 8); // Unique ID for the link
        
        // Calculate expiry time based on duration (minutes)
        const expiresAt = new Date(Date.now() + duration * 60000);

        const newSession = new Session({
            sessionId,
            name,
            duration,
            expiresAt,
            status: 'active',
            creator: req.user ? req.user.id : 'admin' // Link to the "Boss"
        });

        await newSession.save();

        // Optional: Set a server-side timeout to broadcast "End"
        const delay = duration * 60000;
        setTimeout(async () => {
            await endSession(sessionId, req.app.get('socketio'));
        }, delay);

        res.status(201).json({ success: true, sessionId, message: "Engine Initialized" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. Join a VCF Session (The Participants)
 */
exports.joinSession = async (req, res) => {
    try {
        const { sessionId, name, phone } = req.body;

        // Check if session exists and is still active
        const session = await Session.findOne({ sessionId, status: 'active' });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session ended or not found" });
        }

        // Add participant
        const participant = new Participant({
            sessionId,
            name,
            phone
        });

        await participant.save();

        // Update real-time count for the Boss and other participants
        const io = req.app.get('socketio');
        const count = await Participant.countDocuments({ sessionId });
        io.to(sessionId).emit('gainerUpdate', { 
            sessionId, 
            count,
            participant: { name, phone } 
        });

        res.status(200).json({ success: true, message: "Joined successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 3. End Session & Trigger Notifications
 */
async function endSession(sessionId, io) {
    try {
        await Session.findOneAndUpdate({ sessionId }, { status: 'completed' });
        
        // Notify everyone in the room that the VCF is ready
        io.to(sessionId).emit('sessionFinished', {
            sessionId,
            downloadUrl: `/api/vcf/download/${sessionId}`,
            message: "VCF is ready! You can now download the contacts."
        });
        
        console.log(`[NexOra Engine] Session ${sessionId} finalized.`);
    } catch (err) {
        console.error("Error ending session:", err);
    }
}

/**
 * 4. Generate & Download VCF File
 */
exports.downloadVcf = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const participants = await Participant.find({ sessionId });

        if (participants.length === 0) {
            return res.status(404).send("No contacts found in this pool.");
        }

        // Professional VCF Formatting
        let vcfContent = "";
        participants.forEach(p => {
            vcfContent += `BEGIN:VCARD\n`;
            vcfContent += `VERSION:3.0\n`;
            vcfContent += `FN:NexOra ${p.name}\n`;
            vcfContent += `TEL;TYPE=CELL:${p.phone}\n`;
            vcfContent += `END:VCARD\n`;
        });

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="NexOra_Pool_${sessionId}.vcf"`);
        res.send(vcfContent);
    } catch (error) {
        res.status(500).send("Error generating file");
    }
};
