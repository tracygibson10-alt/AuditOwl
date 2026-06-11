const { spawnSync } = require('child_process');
const id = process.argv[2];
if (!id) process.exit(1);

spawnSync('team-db', [`UPDATE email_queue SET status = 'sent' WHERE id = '${id}'`]);
