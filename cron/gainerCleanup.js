const cron = require('node-cron');
const GainerSession = require('../models/GainerSession');
// Import your notification and VCF utilities here

cron.schedule('* * * * *', async () => {
    const expiredSessions = await GainerSession.find({ 
        expiresAt: { $lte: new Date() }, 
        status: 'active' 
    });

    for (let session of expiredSessions) {
        session.status = 'completed';
        // 1. Generate VCF Logic here
        // 2. Send Push Notifications via web-push
        await session.save();
        console.log(`Session ${session.sessionId} completed and processed.`);
    }
});
          
