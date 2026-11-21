const fs = require('fs');
let s = fs.readFileSync('_work/v41/p456.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    setV('evK', txt('')),\n    setV('evtype', txt('L')),\n    replaceItem('ItPos', VAR('lgi'), ADD(VAR('lgn'), num(1)))";
const to = "    LOGX(JX(txt('LY lgi='), VAR('lgi'), txt(' lnv=['), VAR('lnv'), txt('] lgn='), VAR('lgn'), txt(' pos=['), itemOf('ItPos', VAR('lgi')), txt('] ev=['), VAR('ev'), txt(']'))),\n    setV('evK', txt('')),\n    setV('evtype', txt('L')),\n    replaceItem('ItPos', VAR('lgi'), ADD(VAR('lgn'), num(1)))";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P456').join('P457');
fs.writeFileSync('_work/v41/p457.txt', s);
console.log('probe added');