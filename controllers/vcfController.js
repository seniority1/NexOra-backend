import Session from '../models/Session.js';
import Participant from '../models/Participants.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 1. Initialize a New VCF Session (The Boss/Creator)
 */
export const createSession = async (req, res) => {
    try {
        const { name, duration } = req.body;
        const sessionId = uuidv4().substring(0, 8); 
        
        const expiresAt = new Date(Date.now() + duration * 60000);

        const newSession = new Session({
            sessionId,
            name,
            duration,
            expiresAt,
            status: 'active',
            creator: req.user ? req.user.id : 'admin' 
        });

        await newSession.save();

        const delay = duration * 60000;
        setTimeout(async () => {
            const io = req.app.get('socketio');
            if (io) {
                await endSession(sessionId, io);
            }
        }, delay);

        res.status(201).json({ success: true, sessionId, message: "Engine Initialized" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. Join a VCF Session (The Participants)
 */
export const joinSession = async (req, res) => {
    try {
        const { sessionId, name, phone } = req.body;

        const session = await Session.findOne({ sessionId, status: 'active' });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session ended or not found" });
        }

        // Prevent duplicate entries in the same session
        const existing = await Participant.findOne({ sessionId, phone });
        if (existing) {
            return res.status(400).json({ success: false, message: "You are already in this pool!" });
        }

        const participant = new Participant({
            sessionId,
            name,
            phone
        });

        await participant.save();

        const io = req.app.get('socketio');
        if (io) {
            const count = await Participant.countDocuments({ sessionId });
            io.to(sessionId).emit('gainerUpdate', { 
                sessionId, 
                count,
                participant: { name } 
            });
        }

        res.status(200).json({ success: true, message: "Joined successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 3. End Session Helper
 */
async function endSession(sessionId, io) {
    try {
        await Session.findOneAndUpdate({ sessionId }, { status: 'completed' });
        
        io.to(sessionId).emit('sessionFinished', {
            sessionId,
            // Notice we don't send the full URL here for security
            message: "VCF is ready! Verify your number to download."
        });
        
        console.log(`[NexOra Engine] Session ${sessionId} finalized.`);
    } catch (err) {
        console.error("Error ending session:", err);
    }
}

/**
 * 4. SECURE Generate & Download VCF File
 * Now requires ?phone=... in the query to verify participation
 */
export const downloadVcf = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phone } = req.query; // Secure: Get phone from query params

        if (!phone) {
            return res.status(403).send("Verification required: Phone number missing.");
        }

        // Check if the user requesting the file actually joined this specific pool
        const isParticipant = await Participant.findOne({ sessionId, phone });

        if (!isParticipant) {
            return res.status(403).send("Access Denied: This number is not registered in this pool.");
        }

        const participants = await Participant.find({ sessionId });

        if (participants.length === 0) {
            return res.status(404).send("No contacts found.");
        }

        // Professional VCF 3.0 Formatting
        let vcfContent = "";
        participants.forEach(p => {
            vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:NexOra ${p.name}\nTEL;TYPE=CELL:${p.phone}\nEND:VCARD\n`;
        });

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="NexOra_Pool_${sessionId}.vcf"`);
        res.status(200).send(vcfContent);
    } catch (error) {
        res.status(500).send("Error generating file");
    }
};

/**
 * 5. View Participant List (Boss Only)
 */
export const viewLiveList = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Find the session to verify the creator
        const session = await Session.findOne({ sessionId });
        
        // Boss Check: Only the creator (or admin) can see the full list
        if (!session || (req.user && session.creator !== req.user.id)) {
            return res.status(403).json({ success: false, message: "Unauthorized: Only the Boss can view this list." });
        }

        const participants = await Participant.find({ sessionId }).sort({ joinedAt: -1 });
        res.status(200).json(participants);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 6. Get Single Session Details
 */
export const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        res.status(200).json({ 
            success: true, 
            data: {
                title: session.name,
                expiresAt: session.expiresAt,
                status: session.status,
                // Include participant count for the UI
                participantCount: await Participant.countDocuments({ sessionId })
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
