const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
let defOf = {};
for (const [id, b] of Object.entries(BL)) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL[b.inputs.custom_block[1]]; if (pr && pr.mutation) defOf[id] = pr.mutation.proccode; }
const owner = (start) => { let cur = start, g = 0; while (cur && g++ < 3000) { const w = BL[cur]; if (!w) return 'DEAD:' + cur; if (w.topLevel) return defOf[cur] || ('TOP:' + cur); cur = w.parent; } return '?'; };
for (const id of process.argv.slice(2)) console.log(id + ' -> ' + owner(id));
