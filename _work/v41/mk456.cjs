const fs = require('fs');
let s = fs.readFileSync('_work/v41/p455.txt', 'utf8');
// 1) 加一个"直接构造 procedures_call"的助手（不做 B.REP 二次包裹）
const helper = `  const rawCall = (proccode, inputArrays) => {
    let proto = null;
    for (const id of Object.keys(BB)) {
      const b = BB[id];
      if (b.opcode !== 'procedures_prototype' || !b.mutation) continue;
      if (String(b.mutation.proccode) === proccode) { proto = b; break; }
    }
    if (!proto) throw new Error('[P456] prototype not found: ' + proccode);
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length && i < inputArrays.length; i++) inputs[argIds[i]] = inputArrays[i];
    return I('procedures_call', {
      inputs,
      mutation: { tagName: 'mutation', children: [], proccode, argumentids: proto.mutation.argumentids, warp: proto.mutation.warp }
    });
  };
`;
const from1 = "  const collect = (v, out) => {";
if (!s.includes(from1)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from1, helper + from1);
// 2) 用它替换 listlen 的调用
const from2 = "    callProc('listlen %s', [VAR('lnv')]),";
const to2 = "    rawCall('listlen %s', [VAR('lnv')]),";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
s = s.split('P455').join('P456');
fs.writeFileSync('_work/v41/p456.txt', s);
console.log('rawCall helper installed');