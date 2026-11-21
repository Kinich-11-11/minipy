const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
function load(p) { const e = zipRead(p); return JSON.parse(e.find((x) => x.name === 'project.json').data.toString('utf8')); }
function sig(p) {
  const P = load(p);
  const t = P.targets.find((x) => x.name === 'Interpreter');
  const hist = {};
  for (const b of Object.values(t.blocks)) hist[b.opcode] = (hist[b.opcode] || 0) + 1;
  const procs = new Set();
  for (const b of Object.values(t.blocks)) if (b.opcode === 'procedures_definition') { const pr = t.blocks[b.inputs.custom_block[1]]; if (pr && pr.mutation) procs.add(pr.mutation.proccode); }
  const vars = Object.values(t.variables || {}).map((v) => v[0]).sort();
  const lists = Object.values(t.lists || {}).map((v) => v[0]).sort();
  const blocks = Object.keys(t.blocks).length;
  return { hist, procs: [...procs].sort(), vars, lists, blocks };
}
const a = sig(process.argv[2]), b = sig(process.argv[3]);
const diffs = [];
if (a.blocks !== b.blocks) diffs.push('blocks ' + a.blocks + ' vs ' + b.blocks);
const ops = new Set([...Object.keys(a.hist), ...Object.keys(b.hist)]);
for (const o of ops) if ((a.hist[o] || 0) !== (b.hist[o] || 0)) diffs.push(o + ' ' + (a.hist[o] || 0) + ' vs ' + (b.hist[o] || 0));
const pa = new Set(a.procs), pb = new Set(b.procs);
for (const p of pa) if (!pb.has(p)) diffs.push('proc only in shipped: ' + p);
for (const p of pb) if (!pa.has(p)) diffs.push('proc only in rebuilt: ' + p);
const va = a.vars.join('|'), vb = b.vars.join('|');
if (va !== vb) diffs.push('vars differ');
const la = a.lists.join('|'), lb = b.lists.join('|');
if (la !== lb) diffs.push('lists differ');
console.log(diffs.length ? ('DIFF ' + diffs.slice(0, 8).join(' ; ')) : 'MATCH');
