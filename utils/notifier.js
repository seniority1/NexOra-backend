const webpush = require('web-push');

// You will generate these once and save them in your .env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails('mailto:support@nexora.org.ng', publicVapidKey, privateVapidKey);

exports.notifyParticipants = (participants, sessionName) => {
    const payload = JSON.stringify({
        title: 'NexOra Gainer Ready!',
        body: `The session "${sessionName}" has ended. Download your VCF now!`,
        icon: '/assets/logo.png'
    });

    participants.forEach(participant => {
        if (participant.pushSubscription) {
            webpush.sendNotification(participant.pushSubscription, payload)
                .catch(err => console.error("Notification failed", err));
        }
    });
};
      
