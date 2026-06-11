const { spawnSync } = require('child_process');

function runQuery(sql) {
    const result = spawnSync('team-db', [sql]);
    if (result.status !== 0) {
        process.exit(1);
    }
    const output = result.stdout.toString();
    try {
        return output ? JSON.parse(output) : [];
    } catch (e) {
        return [];
    }
}

const pending = runQuery("SELECT * FROM email_queue WHERE status = 'pending'");
if (pending.length === 0) {
    console.log("No pending emails.");
    process.exit(0);
}

console.log(JSON.stringify(pending, null, 2));
