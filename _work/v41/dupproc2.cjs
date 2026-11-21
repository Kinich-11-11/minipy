// node dupproc2.cjs <project.json> [proccode] : scan ALL targets for definitions/prototypes with the same proccode
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const defs = new Map();
const protos = new Map();
for (const t of p.targets) {
  for (const id of Object.keys(t.blocks || {})) {
    const b = t.blocks[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = t.blocks[b.inputs.custom_block[1]];
      if (q && q.mutation) {
        if (!defs.has(q.mutation.proccode)) defs.set(q.mutation.proccode, []);
        defs.get(q.mutation.proccode).push(t.name + '/' + id + ' ' + q.mutation.argumentids);
      }
    }
    if (b.opcode === 'procedures_prototype' && b.mutation) {
      if (!protos.has(b.mutation.proccode)) protos.set(b.mutation.proccode, []);
      protos.get(b.mutation.proccode).push(t.name + '/' + id + ' ' + b.mutation.argumentids);
    }
  }
}
const show = (m, label) => {
  let d = 0;
  for (const [pc, list] of m) if (list.length > 1) { d++; console.log(label + ' DUP ' + pc + ' x' + list.length); for (const x of list) console.log('    ' + x); }
  console.log(label + ' duplicates = ' + d + ' / ' + m.size);
};
if (want) {
  console.log('defs   ' + JSON.stringify(defs.get(want)));
  console.log('protos ' + JSON.stringify(protos.get(want)));
} else { show(defs, 'def'); show(protos, 'proto'); }
