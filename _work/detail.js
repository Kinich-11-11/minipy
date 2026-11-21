
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const lines = [];
const byName = {};
for (const t of p.targets) byName[t.name]=t;

function varName(t, id){ const v=(t.variables||{})[id]; return v? v[0] : (id); }
function listName(t, id){ const l=(t.lists||{})[id]; return l? l[0] : id; }

for (const name of ['Stage','Controller','TextRenderer','Interpreter']) {
  const t = byName[name];
  lines.push('===== '+name+' =====');
  lines.push('-- variables ('+Object.keys(t.variables||{}).length+'): '+Object.values(t.variables||{}).map(v=>v[0]+'='+JSON.stringify(v[1]).slice(0,30)).join(', '));
  lines.push('-- lists ('+Object.keys(t.lists||{}).length+'): '+Object.values(t.lists||{}).map(l=>l[0]+'(len '+l[1].length+')').join(', '));
  lines.push('-- broadcasts: '+JSON.stringify(Object.values(t.broadcasts||{}).map(b=>b.name)));
  lines.push('-- costumes names: '+ (t.costumes||[]).slice(0,8).map(c=>c.name).join(' | ')+ (t.costumes&&t.costumes.length>8?' ...('+t.costumes.length+')':''));
}
// procedures in Interpreter
const it = byName['Interpreter'];
const blocks = it.blocks;
const procs = {};
for (const id in blocks){ const b = blocks[id]; if(b.opcode==='procedures_prototype'){ procs[b.mutation.proccode]= (b.mutation.argumentnames? JSON.parse(b.mutation.argumentnames):[]) } }
lines.push('===== Interpreter custom blocks: '+Object.keys(procs).length);
lines.push(Object.entries(procs).map(([k,v])=>k+' ('+v.join(',')+')').join('\n'));
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-detail.txt', lines.join('\n'));
console.log(lines.join('\n'));
