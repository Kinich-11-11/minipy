const fs = require('fs');
let s = fs.readFileSync('_work/v41/p415.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "  spliceAfter(fallback, chain([\n    IF(EQ(argOf(p1), txt('O')), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "  spliceAfter(fallback, chain([",
  "    LOGX(JX(txt('FV vt='), argOf(p1), txt(' vv=['), argOf(p0), txt('] ev=['), VAR('ev'), txt(']'))),",
  "    IF(EQ(argOf(p1), txt('O')), ["
].join('\n'));
s = s.split('P415').join('P416');
fs.writeFileSync('_work/v41/p416.txt', s);
console.log('wrote p416.txt');