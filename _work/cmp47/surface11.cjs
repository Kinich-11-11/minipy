
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const t = byName(A).TextRenderer;
const out=[]; const p=(...x)=>out.push(x.join(' '));
p('forever: ' + JSON.stringify(t.blocks['+t7Ja[w-D{A~G9LUz#UY']));
const fw = t.blocks['+t7Ja[w-D{A~G9LUz#UY'];
const sub = fw.inputs && fw.inputs.SUBSTACK;
p('substack: ' + JSON.stringify(sub));
const firstId = sub && sub[1];
p('first body block: ' + JSON.stringify(t.blocks[firstId]).slice(0,300));
const kids = Object.keys(t.blocks).filter(id=>t.blocks[id] && t.blocks[id].parent === '+t7Ja[w-D{A~G9LUz#UY');
p('kids of forever: ' + JSON.stringify(kids.map(id=>[id, t.blocks[id].opcode])));
p('total blocks ' + Object.keys(t.blocks).length);
// how many blocks have parent pointing to forever vs substack content
fs.writeFileSync(base+'surface11.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,4000));
