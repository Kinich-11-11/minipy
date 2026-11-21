// argdbg.cjs <project.json> <argid> : show the call + prototype argument names for an argid
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.inputs || !(want in b.inputs)) continue;
  console.log('call ' + id + '  proccode=' + JSON.stringify(b.mutation.proccode));
  console.log('  call argumentids = ' + b.mutation.argumentids);
  console.log('  input keys       = ' + JSON.stringify(Object.keys(b.inputs)));
  for (const q of Object.keys(B)) {
    const pb = B[q];
    if (pb.opcode === 'procedures_prototype' && pb.mutation && pb.mutation.proccode === b.mutation.proccode) {
      console.log('  proto names = ' + pb.mutation.argumentnames);
      console.log('  proto ids   = ' + pb.mutation.argumentids);
      break;
    }
  }
  break;
}
