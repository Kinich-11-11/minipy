const fs = require('fs');
let s = fs.readFileSync('_work/v41/p310.txt', 'utf8');
const start = s.indexOf('  // (3) calluser');
const end = s.indexOf("  console.log('[P310] calluser dispatches");
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
s = s.slice(0, start) + s.slice(end);
s = s.replace("patch('P310 builtin names as values'", "patch('P311 builtin names registered as values (no dispatch yet)'");
s = s.replace("  console.log('[P310] calluser dispatches builtin names to callfn');\n", "  console.log('[P311] only registration; dispatch left for the next round');\n");
s = s.replace(/\[P310\]/g, '[P311]');
fs.writeFileSync('_work/v41/p311.txt', s);
console.log('wrote p311.txt');
