const fs = require('fs');
let s = fs.readFileSync('_work/v41/p443.txt', 'utf8');
const from = "  const hasLt = I('data_listcontainsitem', {\n    fields: B.LISTF('FnName'),\n    inputs: { ITEM: B.REP(JOIN(item('InstCls', VAR('lca')), txt('.__lt__')), [10, '']) }\n  });";
const to = "  const hasLt = I('data_listcontainsitem', {\n    fields: B.LISTF('FnName'),\n    inputs: { ITEM: B.REP(VAR('cfull'), [10, '']) }\n  });";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = "    IF(AND(EQ(VAR('lcat'), txt('O')), hasLt), [\n      // ";
const to2 = "    IF(EQ(VAR('lcat'), txt('O')), [\n      setV('ccls', item('InstCls', VAR('lca'))),\n      setV('cfull', JOIN(JOIN(VAR('ccls'), txt('.')), txt('__lt__')))],\n    IF(AND(EQ(VAR('lcat'), txt('O')), hasLt), [\n      // ";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
fs.writeFileSync('_work/v41/p443.txt', s);
console.log('cfull computed before use');