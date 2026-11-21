// dump the RUN hat chain: node _work/v41/dumprun.cjs <project.json> [depth]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION && b.fields.BROADCAST_OPTION[0] === 'RUN') {
    console.log('RUN hat ' + id);
    let cur = b.next, n = 0;
    while (cur && n++ < 400) {
      const q = B[cur];
      if (!q) break;
      const c = q.inputs && q.inputs.CONDITION;
      const f = Object.entries(q.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
      const call = (q.opcode === 'procedures_call' && q.mutation) ? ' CALL ' + q.mutation.proccode : '';
      console.log('  ' + cur + ' ' + q.opcode + (f ? ' {' + f + '}' : '') + call);
      cur = q.next;
    }
    break;
  }
}
