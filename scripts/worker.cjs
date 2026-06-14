const { spawnSync } = require('child_process');
const path = require('path');
// Load env from server directory
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { sendEmail } = require('../server/emailService');

function runQuery(sql, retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        const result = spawnSync('team-db', [sql]);
        if (result.status === 0) {
            const output = result.stdout.toString();
            try {
                return output ? JSON.parse(output) : [];
            } catch (e) {
                return [];
            }
        }
        lastError = result.stderr.toString() || result.error?.message || 'Unknown team-db error';
        if (lastError.includes('locked')) {
            console.log(`DB locked, retrying (${i + 1}/${retries})...`);
            spawnSync('sleep', ['0.5']);
            continue;
        }
        break;
    }
    return [];
}

async function processQueue() {
    const pending = runQuery("SELECT * FROM email_queue WHERE status = 'pending' LIMIT 10");
    if (pending.length === 0) {
        return;
    }

    console.log(`[${new Date().toISOString()}] Processing ${pending.length} pending emails...`);
    for (const email of pending) {
        const { success, sender } = await sendEmail(email.to_email, email.subject, email.body);
        if (success) {
            runQuery(`UPDATE email_queue SET status = 'sent', sender = '${sender}' WHERE id = '${email.id}'`);
            console.log(`Email ${email.id} marked as sent via ${sender}.`);
        } else {
            console.error(`Failed to send email ${email.id}`);
            runQuery(`UPDATE email_queue SET status = 'failed', sender = '${sender}' WHERE id = '${email.id}'`);
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
