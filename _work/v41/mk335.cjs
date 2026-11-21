const fs = require('fs');
let s = fs.readFileSync('_work/v41/p333.txt', 'utf8');
const from = "  const eqB = T(IT).blocks[eqBlock];\n  const tokExpr = eqB.inputs.OPERAND1;";
const to = "  const eqB = T(IT).blocks[eqBlock];";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
// 把两处 tokExpr 换成"现场新建"的 Tok[auglsp+1]
s = s.split("B.BOOL(I('operator_equals', { inputs: { OPERAND1: tokExpr, OPERAND2: B.REP(txt('='), [10, '']) } }))")
     .join("B.BOOL(I('operator_equals', { inputs: { OPERAND1: item('Tok', ADD(VAR('auglsp'), num(1))), OPERAND2: B.REP(txt('='), [10, '']) } }))");
s = s.split("B.BOOL(I('operator_equals', { inputs: { OPERAND1: tokExpr, OPERAND2: B.REP(txt(','), [10, '']) } }))")
     .join("B.BOOL(I('operator_equals', { inputs: { OPERAND1: item('Tok', ADD(VAR('auglsp'), num(1))), OPERAND2: B.REP(txt(','), [10, '']) } }))");
if (s.includes('tokExpr')) { console.log('MISS2: tokExpr still present'); process.exit(1); }
// 改名成 P335
s = s.split('P333').join('P335');
fs.writeFileSync('_work/v41/p335.txt', s);
console.log('wrote p335.txt');