// probe229.cjs <sb3> <proccode> -- dump a procedure body as pseudo-source
const fs = require('fs');
const { execSync } = require('child_process');
const path = process.argv[2];
const want = process.argv[3];
// unzip project.json
const zip = fs.readFileSync(path);
// minimal zip reader: use powershell? simpler: use node's zlib via yauzl not available; use execSync with tar? On Windows git-bash has unzip.
const tmp = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/_probe229';
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
execSync('unzip -o -q "' + path + '" project.json -d "' + tmp + '"');
const project = JSON.parse(fs.readFileSync(tmp + '/project.json', 'utf8'));
const interp = project.targets.find(t => t.name === 'Interpreter') || project.targets[0];
const BL = interp.blocks;
const ids = Object.keys(BL).filter(id => !String(id).startsWith('_'));
const procOf = {};
for (const id of ids) {
  const b = BL[id];
  if (b.topLevel && b.opcode === 'procedures_definition') {
    const cb = b.inputs && b.inputs.custom_block && typeof b.inputs.custom_block[1] === 'string' ? BL[b.inputs.custom_block[1]] : null;
    if (cb && cb.mutation && cb.mutation.proccode) procOf[cb.mutation.proccode] = id;
  }
}
const target = Object.keys(procOf).find(k => k === want || k.startsWith(want));
if (!target) { console.log('NOT FOUND. have:', Object.keys(procOf).filter(k => /strval|lcmp|lsort|printv|showv|tostr/.test(k)).join('\n')); process.exit(1); }
let n = 0;
const dump = (id, ind, seen) => {
  while (id) {
    const b = BL[id]; if (!b) { console.log(ind + '<missing ' + id + '>'); return; }
    n++;
    let line = ind + b.opcode;
    if (b.fields && Object.keys(b.fields).length) line += ' ' + JSON.stringify(b.fields);
    const ins = {};
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (Array.isArray(v[1])) ins[k] = 'LIT:' + JSON.stringify(v[1]);
      else if (typeof v[1] === 'string') ins[k] = 'BLK#' + v[1];
      else ins[k] = JSON.stringify(v);
    }
    if (Object.keys(ins).length) line += ' ' + JSON.stringify(ins);
    if (b.mutation && b.mutation.proccode) line += ' CALL<' + b.mutation.proccode + '>';
    console.log(line.slice(0, 400));
    if (seen.has(id)) { console.log(ind + ' <CYCLE>'); return; }
    seen.add(id);
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (typeof v[1] === 'string' && k !== 'CONDITION' || (k === 'CONDITION' && false)) { }
    }
    // recurse into substacks / conditions
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (typeof v[1] === 'string') {
        if (k === 'SUBSTACK' || k === 'SUBSTACK2') { console.log(ind + ' .' + k + ':'); dump(v[1], ind + '  ', seen); }
        else { dumpExpr(v[1], ind + '  [' + k + '] ', new Set()); }
      }
    }
    id = b.next;
  }
};
const dumpExpr = (id, ind, seen) => {
  if (!id || seen.has(id)) return;
  const b = BL[id]; if (!b) { console.log(ind + '<missing ' + id + '>'); return; }
  seen.add(id);
  let line = ind + b.opcode;
  if (b.fields && Object.keys(b.fields).length) line += ' ' + JSON.stringify(b.fields);
  if (b.mutation && b.mutation.proccode) line += ' CALL<' + b.mutation.proccode + '>';
  console.log(line.slice(0, 300));
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (typeof v[1] === 'string') dumpExpr(v[1], ind + k + '=', new Set(seen));
    else if (Array.isArray(v) && Array.isArray(v[1])) { }
  }
};
dump(procOf[target], '', new Set());
console.log('-- blocks:', n);
