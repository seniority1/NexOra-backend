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
        const { sessionId, name } = req.body;
        let { phone } = req.body;

        phone = phone.trim().replace(/[\s\-]/g, '');

        const session = await Session.findOne({ sessionId, status: 'active' });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session ended or not found" });
        }

        const existing = await Participant.findOne({ sessionId, phone });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already secured your entry in this pool!" 
            });
        }

        const participant = new Participant({
            sessionId,
            name: name.trim(),
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
 * Updated: Records completedAt for the 48-hour countdown
 */
async function endSession(sessionId, io) {
    try {
        // Record the exact time the pool finished
        await Session.findOneAndUpdate(
            { sessionId }, 
            { status: 'completed', completedAt: new Date() }
        );
        
        io.to(sessionId).emit('sessionFinished', {
            sessionId,
            message: "VCF is ready! Verify your number to download."
        });
        
        console.log(`[NexOra Engine] Session ${sessionId} finalized. 48h download window started.`);
    } catch (err) {
        console.error("Error ending session:", err);
    }
}

/**
 * 4. SECURE Generate & Download VCF File
 * Updated: Enforces 48-hour expiration window
 */
export const downloadVcf = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phone } = req.query; 

        if (!phone) {
            return res.status(403).send("Verification required: Phone number missing.");
        }

        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).send("Session not found.");

        // 🛡️ 48-HOUR CHECK
        if (session.completedAt) {
            const now = new Date();
            const hoursSinceCompletion = (now - new Date(session.completedAt)) / (1000 * 60 * 60);
            
            if (hoursSinceCompletion > 48) {
                return res.status(410).send("Link Expired: This VCF is no longer available (48h limit exceeded).");
            }
        }

        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');
        const isParticipant = await Participant.findOne({ sessionId, phone: cleanPhone });

        if (!isParticipant) {
            return res.status(403).send("Access Denied: This number is not registered in this pool.");
        }

        const participants = await Participant.find({ sessionId });
        if (participants.length === 0) return res.status(404).send("No contacts found.");

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
        const session = await Session.findOne({ sessionId });
        
        if (!session || (req.user && session.creator !== req.user.id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        const participants = await Participant.find({ sessionId }).sort({ joinedAt: -1 });
        res.status(200).json(participants);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 6. Get Single Session Details
 * Updated: Checks for 48-hour expiry to update frontend UI
 */
export const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        let currentStatus = session.status;

        // Check for expiration
        if (session.completedAt) {
            const now = new Date();
            const diff = (now - new Date(session.completedAt)) / (1000 * 60 * 60);
            if (diff > 48) {
                currentStatus = 'expired';
            }
        }

        const participantCount = await Participant.countDocuments({ sessionId });

        res.status(200).json({ 
            success: true, 
            data: {
                title: session.name,
                expiresAt: session.expiresAt,
                status: currentStatus, // Sends 'expired' if past 48h
                participantCount
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
