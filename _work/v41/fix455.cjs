const fs = require('fs');
let s = fs.readFileSync('_work/v41/p455.txt', 'utf8');
const from = `  const newBody = [
    setV('lgi', VAR('ev')),
    callProc('listlen %s', [itemOf('ItSrc', VAR('lgi'))]),
    setV('lgn', VAR('ev')),`;
const to = `  const newBody = [
    setV('lgi', VAR('ev')),
    setV('lnv', itemOf('ItSrc', VAR('lgi'))),
    callProc('listlen %s', [VAR('lnv')]),
    setV('lgn', VAR('ev')),`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("for (const n of ['lgi', 'lgn'])", "for (const n of ['lgi', 'lgn', 'lnv'])").replace("newVar('lgi', 0); newVar('lgn', 0);", "newVar('lgi', 0); newVar('lgn', 0); newVar('lnv', '');");
fs.writeFileSync('_work/v41/p455.txt', s);
console.log('listlen arg via variable');