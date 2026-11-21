const fs = require('fs');
let s = fs.readFileSync('_work/v41/p339.txt', 'utf8');
const from = [
  "      I('data_replaceitemoflist', {",
  "        fields: { LIST: ['Tok', null] },",
  "        inputs: { INDEX: B.REP(VAR('tsi'), [4, '0']), ITEM: B.REP(item('TokSave', VAR('tsi')), [10, '']) }",
  "      }),"
].join('\n');
const to = [
  "      I('data_replaceitemoflist', {",
  "        fields: B.LISTF('Tok'),",
  "        inputs: { INDEX: B.REP(VAR('tsi'), [4, '0']), ITEM: B.REP(item('TokSave', VAR('tsi')), [10, '']) }",
  "      }),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p339.txt', s.replace(from, to));
console.log('ok: LISTF form');