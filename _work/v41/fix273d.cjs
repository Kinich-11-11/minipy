const fs = require('fs');
const p = '_work/v41/p273.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    IF(listHas('BifName', item('Tok', argOf('idx'))), [";
const to = [
  "    IF(I('data_listcontainsitem', { fields: B.LISTF('BifName'),",
  "      inputs: { ITEM: B.REP(item('Tok', argOf('idx')), [10, '']) } }), ["
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
