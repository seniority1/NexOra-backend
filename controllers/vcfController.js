import User from '../models/User.js'; // The "All-in-One" Source of Truth
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// 🔧 Configure Web-Push with your VAPID keys
const vapidEmail = process.env.VAPID_EMAIL || 'alphonsusokoko40@gmail.com';
webpush.setVapidDetails(
    vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * 1. Initialize a New VCF Session
 * Saved inside the authenticated User's document
 */
export const createSession = async (req, res) => {
    try {
        const { name, duration } = req.body;
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

        const sessionId = uuidv4().substring(0, 8); 
        const expiresAt = new Date(Date.now() + duration * 60000);

        const newSession = {
            sessionId,
            name,
            duration,
            expiresAt,
            status: 'active',
            createdAt: new Date(),
            participants: []
        };

        // Push into User's vcfSessions array
        await User.findByIdAndUpdate(req.user.id, {
            $push: { vcfSessions: newSession }
        });

        // Set automation to end session
        setTimeout(async () => {
            const io = req.app.get('socketio');
            if (io) await endSession(sessionId, io);
        }, duration * 60000);

        res.status(201).json({ success: true, sessionId, message: "Engine Initialized" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. Join a VCF Session
 * Finds the User (Boss) who owns the session and adds participant
 */
export const joinSession = async (req, res) => {
    try {
        const { sessionId, name, phone } = req.body;
        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');

        // Find the owner of this session
        const owner = await User.findOne({ "vcfSessions.sessionId": sessionId });
        if (!owner) return res.status(404).json({ success: false, message: "Pool not found." });

        const session = owner.vcfSessions.find(s => s.sessionId === sessionId);
        if (session.status !== 'active') return res.status(400).json({ success: false, message: "Pool closed." });

        // Check if phone already exists in this specific session
        const existing = session.participants.find(p => p.phone === cleanPhone);
        if (existing) return res.status(400).json({ success: false, message: "Already in pool!" });

        // Push new participant to the nested array
        session.participants.push({
            name: name.trim(),
            phone: cleanPhone,
            joinedAt: new Date()
        });

        await owner.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(sessionId).emit('gainerUpdate', { sessionId, count: session.participants.length });
        }

        res.status(200).json({ success: true, message: "Joined successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 3. Save Push Subscription (Nested)
 */
export const subscribeToNotifications = async (req, res) => {
    try {
        const { sessionId, phone, subscription } = req.body;
        
        const owner = await User.findOne({ "vcfSessions.sessionId": sessionId });
        if (!owner) return res.status(404).json({ success: false });

        const session = owner.vcfSessions.find(s => s.sessionId === sessionId);
        const participant = session.participants.find(p => p.phone === phone);
        
        if (participant) {
            participant.pushSubscription = subscription;
            await owner.save();
        }

        res.status(200).json({ success: true, message: "Notifications enabled" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. End Session Logic
 */
async function endSession(sessionId, io) {
    try {
        const owner = await User.findOne({ "vcfSessions.sessionId": sessionId });
        if (!owner) return;

        const session = owner.vcfSessions.find(s => s.sessionId === sessionId);
        if (session.status !== 'active') return;

        session.status = 'completed';
        session.completedAt = new Date();
        await owner.save();

        io.to(sessionId).emit('sessionFinished', { sessionId, count: session.participants.length });

        const notificationPayload = JSON.stringify({
            title: "NexOra: VCF Ready! 🔥",
            body: `The pool "${session.name}" is finished. Download your contacts now!`,
            icon: "https://nexora.org.ng/asset/logo.jpg", 
            data: { url: `https://nexora.org.ng/vcf.html?id=${sessionId}` }
        });

        session.participants.forEach(p => {
            if (p.pushSubscription && p.pushSubscription.endpoint) {
                webpush.sendNotification(p.pushSubscription, notificationPayload)
                    .catch(err => console.error(`Push failed:`, err.statusCode));
            }
        });
    } catch (err) {
        console.error("Error ending session:", err);
    }
}

/**
 * 5. Download VCF (Generates from Nested Data)
 */
export const downloadVcf = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phone } = req.query; 

        const owner = await User.findOne({ "vcfSessions.sessionId": sessionId });
        if (!owner) return res.status(404).send("Session not found.");

        const session = owner.vcfSessions.find(s => s.sessionId === sessionId);
        
        // Expiry check (48h)
        if (session.completedAt) {
            const diff = (new Date() - new Date(session.completedAt)) / (1000 * 60 * 60);
            if (diff > 48) return res.status(410).send("Link Expired.");
        }

        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');
        const isParticipant = session.participants.some(p => p.phone === cleanPhone);
        if (!isParticipant) return res.status(403).send("Unauthorized.");

        let vcf = "";
        session.participants.forEach(p => {
            vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${p.name}\nTEL;TYPE=CELL:${p.phone}\nEND:VCARD\n`;
        });

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="NexOra_${sessionId}.vcf"`);
        res.status(200).send(vcf);
    } catch (error) {
        res.status(500).send("Error generating file");
    }
};

/**
 * 6. View List (Owner Only)
 */
export const viewLiveList = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        const session = user.vcfSessions.find(s => s.sessionId === req.params.sessionId);
        
        if (!session) return res.status(403).json({ success: false, message: "Access denied." });
        res.status(200).json(session.participants.reverse());
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 7. Get Session Details (Public)
 */
export const getSessionDetails = async (req, res) => {
    try {
        const owner = await User.findOne({ "vcfSessions.sessionId": req.params.sessionId }).lean();
        if (!owner) return res.status(404).json({ success: false });

        const session = owner.vcfSessions.find(s => s.sessionId === req.params.sessionId);

        res.status(200).json({ success: true, data: { 
            title: session.name, 
            status: session.status, 
            participantCount: session.participants ? session.participants.length : 0, 
            expiresAt: session.expiresAt, 
            completedAt: session.completedAt 
        } });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

/**
 * 8. Get Active Sessions (Dashboard View)
 * Updated with .lean() and robust array mapping to fix Frontend rendering.
 */
export const getActiveSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('vcfSessions').lean();
        
        if (!user || !user.vcfSessions) {
            return res.status(200).json([]);
        }

        // Return latest 5 sessions with participant counts
        // Using raw JS object properties due to .lean()
        const formattedSessions = user.vcfSessions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(s => ({
                ...s,
                participantCount: s.participants ? s.participants.length : 0
            }));

        res.status(200).json(formattedSessions);
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        res.status(500).json([]);
    }
};
