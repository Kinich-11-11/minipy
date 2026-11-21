const fs = require('fs');
const p = '_work/v41/p230.txt';
let s = fs.readFileSync(p, 'utf8');
const openOld = "  const open = () => CONTAINS('([{', tok(VAR('bek')));";
const closeOld = "  const close = () => CONTAINS(')]}', tok(VAR('bek')));";
if (!s.includes(openOld) || !s.includes(closeOld)) { console.log('MISS helpers'); process.exit(1); }
s = s.replace(openOld, [
  "  const isOpenV = (v) => CONTAINS('([{', v);",
  "  const isCloseV = (v) => CONTAINS(')]}', v);",
  "  const open = () => isOpenV(tok(VAR('bek')));"
].join('\n'));
s = s.replace(closeOld, "  const close = () => isCloseV(tok(VAR('bek')));");
s = s.split('isOpen(letterOf').join('isOpenV(letterOf)'.slice(0, -1));
s = s.split('isClose(letterOf').join('isCloseV(letterOf)'.slice(0, -1));
s = s.split('isOpen(VAR(').join('isOpenV(VAR(');
s = s.split('isClose(VAR(').join('isCloseV(VAR(');
fs.writeFileSync(p, s);
console.log('ok');
