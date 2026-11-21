const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function del(a,tag){
  const i=c.indexOf(a);
  if(i>=0){ let ls=c.lastIndexOf(String.fromCharCode(10), i); let le=c.indexOf(String.fromCharCode(10), i); c=c.slice(0,ls+1)+c.slice(le+1); n++; return; }
  bad.push(tag);
}
function rep(a,b,tag){
  if(c.indexOf(a)>=0){ c=c.split(a).join(b); n++; return; }
  const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10));
  const b2=b.split(String.fromCharCode(10)).join(String.fromCharCode(13,10));
  if(c.indexOf(a2)>=0){ c=c.split(a2).join(b2); n++; return; }
  bad.push(tag);
}
del("...L.outLine(E.join(E.str('II ino='), E.join(E.var('ino'), E.join(E.str('|cm='), E.var('cm'))))),",'d1');
del("...L.outLine(E.join(E.str('LP cm='), E.var('cm'))),",'d2');
rep("      S.If(E.eq(E.letter(E.num(1), E.var('ty')), E.str('C')), [\n        ...L.payInto(E.var('ty'), 'clo'), ...L.payInto(E.var('xv'), 'ino'),\n        S.set('cm', E.item('InClass', E.var('ino'))),\n        S.Until(E.eq(E.var('cm'), E.num(0)), [\n          S.If(E.eq(E.var('cm'), E.var('clo')), [S.set('res', E.str('B1'))]),\n          S.set('cm', E.item('ClBase', E.var('cm'))),\n        ]),\n      ]),", "      S.If(E.eq(E.letter(E.num(1), E.var('ty')), E.str('C')), [\n        ...L.payInto(E.var('ty'), 'clo'),\n        S.If(E.eq(E.letter(E.num(1), E.var('xv')), E.str('O')), [\n          ...L.payInto(E.var('xv'), 'ino'),\n          S.set('cm', E.item('InClass', E.var('ino'))),\n          S.Until(E.lt(E.var('cm'), E.num(1)), [\n            S.If(E.eq(E.var('cm'), E.var('clo')), [S.set('res', E.str('B1'))]),\n            S.set('cm', E.item('ClBase', E.var('cm'))),\n          ]),\n        ]),\n      ]),", 'blk');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));