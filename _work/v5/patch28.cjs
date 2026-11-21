const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
let n=0;
// 1) init cai before the operand scan
let a="S.set('nargs', E.num(2)), S.set('j', E.num(1)),";
if(c.includes(a)){ c=c.replace(a, a+" S.set('cai', E.str('')),"); n++; } else console.log('MISS1');
// 2) capture the segment before each '|'
const re2=/S\.If\(E\.eq\(E\.letter\(E\.var\('j'\), ia\(\)\), E\.str\('\|'\)\), \[\r?\n([ \t]*)\.\.\.substrInto\(ia\(\), E\.add\(E\.var\('j'\), E\.num\(1\)\), E\.sub\(E\.slen\(ia\(\)\), E\.var\('j'\)\), 'nargs'\),/;
if(re2.test(c)){ c=c.replace(re2,(m,ind)=>m.replace("...substrInto(ia(), E.add(E.var('j'), E.num(1))", ind+"...substrInto(ia(), E.num(1), E.sub(E.var('j'), E.num(1)), 'cai'),\r\n"+ind+"...substrInto(ia(), E.add(E.var('j'), E.num(1))")); n++; } else console.log('MISS2');
// 3) drop the stale post-loop assignment
const re3=/^[ \t]*S\.set\('cai', ia\()\),[\r\n]+/m;
if(re3.test(c)){ c=c.replace(re3,''); n++; } else console.log('MISS3');
fs.writeFileSync(P,c);
console.log('applied',n,'/3');
