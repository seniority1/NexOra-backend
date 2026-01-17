const vCard = require('vcards-js');
const fs = require('fs');
const path = require('path');

exports.generateSessionVCF = async (session) => {
    const card = vCard();
    let vcfContent = '';

    session.participants.forEach(person => {
        const contact = vCard();
        contact.firstName = person.name;
        contact.organization = 'NexOra Gainer';
        contact.workPhone = `${person.countryCode}${person.phone}`;
        vcfContent += contact.getFormattedString();
    });

    const fileName = `NexOra_${session.sessionId}.vcf`;
    const filePath = path.join(__dirname, '../public/downloads/', fileName);

    fs.writeFileSync(filePath, vcfContent);
    return `/downloads/${fileName}`; // Return the URL for the user to click
};
