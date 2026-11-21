const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8');
const s=c.indexOf('  function compNest() {');
const e=c.indexOf('  function compIfStmt() {', s);
let body=c.slice(s,e); let n=0;
function rep(a,b){ if(body.indexOf(a)>=0){ body=body.split(a).join(b); n++; } }
rep("      ...pushT('n', Ch(nd(), E.num(4))),", "      ...pushT('n', Ch(nd(), E.num(5))),");
rep("      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(3)))),", "      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(4)))),");
rep("      ...pushT('n', Ch(nd(), E.num(2))),", "      ...pushT('n', Ch(nd(), E.num(3))),");
rep("      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(1)))),", "      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),");
rep("      ...pushT('n', Ch(nd(), E.num(0))),", "      ...pushT('n', Ch(nd(), E.num(1))),");
c=c.slice(0,s)+body+c.slice(e);
fs.writeFileSync(P,c); console.log('fixed',n,'refs');