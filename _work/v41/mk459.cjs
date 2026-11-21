const fs = require('fs');
let s = fs.readFileSync('_work/v41/p458.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    setV('evK', txt('')),\n    setV('evtype', txt('L'))";
const to = "    LOGX(JX(txt('LY2 lgi='), VAR('lgi'), txt(' lgn='), VAR('lgn'), txt(' pos=['), itemOf('ItPos', VAR('lgi')), txt('] lnv=['), VAR('lnv'), txt('] ev=['), VAR('ev'), txt(']'))),\n    setV('evK', txt('')),\n    setV('evtype', txt('L'))";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P458').join('P459');
fs.writeFileSync('_work/v41/p459.txt', s);
console.log('probe added');