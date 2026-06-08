const { spawnSync } = require('child_process');
const sql = "SELECT 'hello \"world\"' as msg";
const result = spawnSync('team-db', [sql]);
console.log('STDOUT:', result.stdout.toString());
console.log('STDERR:', result.stderr.toString());
