const fs = require('fs');
let s = fs.readFileSync('_work/v41/p433.txt', 'utf8');
const from = `  for (const procName of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const def = defIdOf(procName);`;
const to = `  for (const procName of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    let def = null;
    try { def = defIdOf(procName); } catch (e) { def = null; }
    if (!def) { console.log('[P433] skip ' + procName + ' (no static definition)'); continue; }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p433.txt', s.replace(from, to));
console.log('optional callfnW');