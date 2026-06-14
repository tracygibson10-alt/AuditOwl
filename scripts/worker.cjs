const { spawnSync } = require('child_process');
const path = require('path');
// Load env from server directory
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { sendEmail } = require('../server/emailService');

function runQuery(sql) {
    const result = spawnSync('team-db', [sql]);
    if (result.status !== 0) {
        // Just return empty if DB fails temporarily
        return [];
    }
    const output = result.stdout.toString();
    try {
        return output ? JSON.parse(output) : [];
    } catch (e) {
        return [];
    }
}

async function processQueue() {
    const pending = runQuery("SELECT * FROM email_queue WHERE status = 'pending' LIMIT 10");
    if (pending.length === 0) {
        return;
    }

    console.log(`[${new Date().toISOString()}] Processing ${pending.length} pending emails...`);
    for (const email of pending) {
        const sent = await sendEmail(email.to_email, email.subject, email.body);
        if (sent) {
            runQuery(`UPDATE email_queue SET status = 'sent' WHERE id = '${email.id}'`);
            console.log(`Email ${email.id} marked as sent.`);
        } else {
            console.error(`Failed to send email ${email.id}`);
            // We could update status to 'failed' or just let it retry
        }
    }
}

async function start() {
    console.log(`[${new Date().toISOString()}] Email worker started.`);
    while (true) {
        try {
            await processQueue();
        } catch (err) {
            console.error("Worker error:", err);
        }
        // Sleep for 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

start();
