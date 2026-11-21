const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const Q='D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
const C='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let q=fs.readFileSync(Q,'utf8'); let n=0; const bad=[];
function rep(s,a,b,tag){ if(s.indexOf(a)>=0){ return [s.replace(a,b), true]; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(s.indexOf(a2)>=0){ return [s.replace(a2,b2), true]; } bad.push(tag); return [s,false]; }
const kwOld="          S.If(E.eq(v(), E.str('in')), [";
const kwNew=["          S.If(E.eq(v(), E.str('if')), [...binPush(E.str('if'))], [",
  "            S.If(E.eq(v(), E.str('else')), [...binPush(E.str('else'))], [",
  "          S.If(E.eq(v(), E.str('in')), ["].join(NL);
let r1=rep(q, kwOld, kwNew, 'kw'); q=r1[0]; if(r1[1]) n++;
// close the two extra parens at the end of inKw
const tailOld=["            ]),",
  "          ]),",
  "        ]),",
  "      ]),",
  "    ];",
  "  }",
  "",
  "  // ------------------------------------------------ statement start"].join(NL);
const tailNew=["            ]),",
  "          ]),",
  "        ]),",
  "      ]),",
  "            ]),",
  "          ]),",
  "    ];",
  "  }",
  "",
  "  // ------------------------------------------------ statement start"].join(NL);
let r2=rep(q, tailOld, tailNew, 'kwtail'); q=r2[0]; if(r2[1]) n++;
fs.writeFileSync(Q,q);
let c=fs.readFileSync(C,'utf8');
const ternCase=["      S.If(E.eq(ck(), E.str('tern')), [",
  "        S.chg('labTop', E.num(2)),",
  "        S.set('l1', E.sub(E.var('labTop'), E.num(1))),",
  "        S.set('l2', E.var('labTop')),",
  "        ...pushT('l', E.var('l2')),",
  "        ...pushT('n', Ch(nd(), E.num(2))),",
  "        ...pushT('l', E.var('l1')),",
  "        ...pushT('j', E.str('JMP'), E.var('l2')),",
  "        ...pushT('n', Ch(nd(), E.num(0))),",
  "        ...pushT('j', E.str('JZ'), E.var('l1')),",
  "        ...pushT('n', Ch(nd(), E.num(1))),",
  "      ]),"].join(NL);
const anchor="      S.If(E.eq(ck(), E.str('attr')), [...pushT('e', E.str('GETATTR'), NdA(nd())), ...kidsRev(0)]),";
let r3=rep(c, anchor, ternCase+NL+anchor, 'terncase'); c=r3[0]; if(r3[1]) n++;
fs.writeFileSync(C,c);
console.log('applied',n,'missed:',JSON.stringify(bad));