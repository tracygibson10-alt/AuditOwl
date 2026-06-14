const { spawnSync } = require('child_process');
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to run team-db queries safely
function runQuery(sql) {
    const result = spawnSync('team-db', [sql]);
    if (result.status !== 0) {
        const errorMsg = result.stderr.toString() || result.error?.message || 'Unknown team-db error';
        console.error(`DB Error: ${errorMsg}\nQuery: ${sql}`);
        throw new Error('Database operation failed');
    }
    const output = result.stdout.toString();
    try {
        return output ? JSON.parse(output) : [];
    } catch (e) {
        console.error(`Failed to parse team-db output: ${output}`);
        return [];
    }
}

async function sendEmail(to, subject, body) {
    try {
        console.log(`[RESEND] Sending email to ${to}...`);
        const { data, error } = await resend.emails.send({
            from: 'AuditOwl <reports@auditowl.com>',
            to: [to],
            subject: subject,
            text: body,
        });

        if (error) {
            console.error('[RESEND ERROR]', error);
            // If it's a domain validation error, we might need to use the default onboard@resend.dev
            if (error.message && error.message.includes('not verified')) {
                console.log('[RESEND] Attempting fallback to onboarding@resend.dev...');
                const fallback = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: [to],
                    subject: subject,
                    text: body,
                });
                if (fallback.error) {
                    console.error('[RESEND FALLBACK ERROR]', fallback.error);
                    throw fallback.error;
                }
            } else {
                throw error;
            }
        }
        console.log(`[RESEND] Email sent successfully to ${to}`);
        return true;
    } catch (err) {
        console.error('[RESEND FAILED]', err.message);
        return false;
    }
}

async function queueAuditEmail(email, auditId, url, isFull = false) {
    const reportUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/report/${auditId}`;
    const pdfUrl = `${process.env.API_BASE || 'http://localhost:3001'}/api/report/${auditId}/pdf`;
    
    let subject, body;

    if (isFull) {
        subject = `Your AuditOwl Full Deep-Dive Report: ${url}`;
        body = `Hello,

Your comprehensive AI-powered CRO and SEO deep-dive audit for ${url} is ready.

You can view your detailed interactive report here:
${reportUrl}

You can also download the PDF version directly here:
${pdfUrl}

Thank you for being a paid customer of AuditOwl!

Best,
The AuditOwl Team`;
    } else {
        subject = `Your AuditOwl Free Mini-Audit: ${url}`;
        body = `Hello,

Your AI-powered mini-audit for ${url} is ready.

View your report results here:
${reportUrl}

Want the full implementation roadmap?
Upgrade to our Full Deep-Dive Audit for just $19 to get 5-7 detailed fix-it guides, technical SEO analysis, and competitor benchmarking.

Upgrade here: ${reportUrl} (Click "Get Full Audit")

Best,
The AuditOwl Team`;
    }

    const id = crypto.randomUUID();
    const safeBody = body.replace(/'/g, "''");
    const safeSubject = subject.replace(/'/g, "''");
    
    runQuery(`INSERT INTO email_queue (id, to_email, subject, body, status) VALUES ('${id}', '${email}', '${safeSubject}', '${safeBody}', 'pending')`);
    
    console.log(`Email queued for ${email} (Audit: ${auditId}, Type: ${isFull ? 'Full' : 'Mini'})`);
    
    // Attempt to send immediately
    const sent = await sendEmail(email, subject, body);
    if (sent) {
        runQuery(`UPDATE email_queue SET status = 'sent' WHERE id = '${id}'`);
    }

    return id;
}

module.exports = { queueAuditEmail, sendEmail };
