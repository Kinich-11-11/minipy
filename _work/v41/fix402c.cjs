const fs = require('fs');
let s = fs.readFileSync('_work/v41/p402.txt', 'utf8');
s = s.replace("  let keyEval = null, minkeyCall = null, last = null;\n  const findCalls = (id) => {", "  let keyEval = null, minkeyCall = null, last = null; let pcSeen = 0;\n  const findCalls = (id) => {");
s = s.replace("      if (q.opcode === 'procedures_call' && q.mutation) {\n        const pc = String(q.mutation.proccode);", "      if (q.opcode === 'procedures_call' && q.mutation) {\n        pcSeen++;\n        const pc = String(q.mutation.proccode);");
s = s.replace("  findCalls(elseFirst);", "  findCalls(elseFirst);\n  console.log('[P402] findCalls saw ' + pcSeen + ' calls; keyEval=' + keyEval + ' minkey=' + minkeyCall);");
fs.writeFileSync('_work/v41/p402.txt', s);
console.log('instrumented');