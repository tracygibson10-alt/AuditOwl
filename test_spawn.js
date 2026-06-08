const { spawnSync } = require('child_process');
const sql = "SELECT 'hello \"world\"' as msg";
const result = spawnSync('team-db', [sql]);
console.log(result.stdout.toString());
