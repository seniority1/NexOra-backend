import Session from '../models/Session.js';
import Participant from '../models/Participants.js';
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
 * 2. Join a VCF Session (Syncs with Session Model Array)
 */
export const joinSession = async (req, res) => {
    try {
        const { sessionId, name, phone } = req.body;
        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');

        const session = await Session.findOne({ sessionId, status: 'active' });
        if (!session) return res.status(404).json({ success: false, message: "Pool closed." });

        // Check separate collection for duplicates
        const existing = await Participant.findOne({ sessionId, phone: cleanPhone });
        if (existing) return res.status(400).json({ success: false, message: "Already in pool!" });

        // Save to Participant Collection
        const participant = new Participant({
            sessionId,
            name: name.trim(),
            phone: cleanPhone
        });
        await participant.save();

        // 🔥 Add to Session internal participants array for Notifications
        session.participants.push({
            name: name.trim(),
            phone: cleanPhone,
            joinedAt: new Date()
        });
        await session.save();

        const io = req.app.get('socketio');
        if (io) {
            const count = await Participant.countDocuments({ sessionId });
            io.to(sessionId).emit('gainerUpdate', { sessionId, count });
        }

        res.status(200).json({ success: true, message: "Joined successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 3. Save Push Subscription (Updated to sync with Session)
 */
export const subscribeToNotifications = async (req, res) => {
    try {
        const { sessionId, phone, subscription } = req.body;
        
        // Update the separate Participant record
        await Participant.findOneAndUpdate(
            { sessionId, phone },
            { pushSubscription: subscription }
        );

        // Update the nested participant inside the Session record
        const session = await Session.findOne({ sessionId });
        if (session) {
            const pIndex = session.participants.findIndex(p => p.phone === phone);
            if (pIndex !== -1) {
                session.participants[pIndex].pushSubscription = subscription;
                await session.save();
            }
        }

        res.status(200).json({ success: true, message: "Notifications enabled" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. End Session & Send Notifications (Updated for nexora.org.ng)
 */
async function endSession(sessionId, io) {
    try {
        // 🔥 FIX: Count participants BEFORE closing so the number is locked in the DB
        const finalCount = await Participant.countDocuments({ sessionId });

        const session = await Session.findOneAndUpdate(
            { sessionId }, 
            { 
                status: 'completed', 
                completedAt: new Date(),
                participantCount: finalCount // Saves the final number so it never returns to 0
            },
            { new: true }
        );
        
        if (!session) return;

        // 🚀 Socket Alert
        io.to(sessionId).emit('sessionFinished', { sessionId, count: finalCount });

        // 🔔 WEB PUSH ALERT
        const notifiedParticipants = session.participants.filter(p => p.pushSubscription && p.pushSubscription.endpoint);

        const notificationPayload = JSON.stringify({
            title: "NexOra: VCF Ready! 🔥",
            body: `The pool "${session.name}" is finished. Download your contacts now!`,
            icon: "https://nexora.org.ng/asset/logo.jpg", 
            data: { 
                url: `https://nexora.org.ng/join.html?id=${sessionId}` 
            }
        });

        notifiedParticipants.forEach(p => {
            webpush.sendNotification(p.pushSubscription, notificationPayload)
                .catch(err => console.error(`Push failed for ${p.phone}:`, err.statusCode));
        });

        console.log(`[NexOra Engine] Session ${sessionId} finalized with ${finalCount} users.`);
    } catch (err) {
        console.error("Error ending session:", err);
    }
}

/**
 * 5. Download VCF
 */
export const downloadVcf = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phone } = req.query; 

        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).send("Session not found.");

        if (session.completedAt) {
            const diff = (new Date() - new Date(session.completedAt)) / (1000 * 60 * 60);
            if (diff > 48) return res.status(410).send("Link Expired (48h limit).");
        }

        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');
        const isParticipant = await Participant.findOne({ sessionId, phone: cleanPhone });
        if (!isParticipant) return res.status(403).send("Number not registered.");

        const contacts = await Participant.find({ sessionId });
        let vcf = "";
        contacts.forEach(p => {
            vcf += `BEGIN:VCARD\nVERSION:3.0\nFN: ${p.name}\nTEL;TYPE=CELL:${p.phone}\nEND:VCARD\n`;
        });

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="NexOra_${sessionId}.vcf"`);
        res.status(200).send(vcf);
    } catch (error) {
        res.status(500).send("Error generating file");
    }
};

/**
 * 6. View List & Get Details
 */
export const viewLiveList = async (req, res) => {
    try {
        const participants = await Participant.find({ sessionId: req.params.sessionId }).sort({ joinedAt: -1 });
        res.status(200).json(participants);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSessionDetails = async (req, res) => {
    try {
        const session = await Session.findOne({ sessionId: req.params.sessionId });
        if (!session) return res.status(404).json({ success: false });

        let status = session.status;
        if (session.completedAt && (new Date() - new Date(session.completedAt)) / 3600000 > 48) {
            status = 'expired';
        }

        const count = await Participant.countDocuments({ sessionId: req.params.sessionId });
        res.status(200).json({ success: true, data: { 
            title: session.name, 
            status, 
            participantCount: count, 
            expiresAt: session.expiresAt, 
            completedAt: session.completedAt 
        } });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};
