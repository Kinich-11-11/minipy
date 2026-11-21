const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="S.set('nargs', E.num(2)), S.set('j', E.num(1)),";
if(c.indexOf(A)>=0 && c.indexOf("S.set('cai', E.str('')),")<0){ c=c.replace(A, A+" S.set('cai', E.str('')),"); n++; } else console.log('skip1');
const T="...substrInto(ia(), E.add(E.var('j'), E.num(1)), E.sub(E.slen(ia()), E.var('j')), 'nargs'),";
let ti=c.indexOf(T);
if(ti>=0){
  let ls=c.lastIndexOf(String.fromCharCode(10), ti);
  let ind=c.slice(ls+1, ti); if(ind.trim()!=='') ind='          ';
  const ins=ind+"...substrInto(ia(), E.num(1), E.sub(E.var('j'), E.num(1)), 'cai'),"+String.fromCharCode(13,10);
  c=c.slice(0,ls+1)+ins+c.slice(ls+1); n++;
} else console.log('miss2');
const D="S.set('cai', ia()),";
let di=c.indexOf(D);
if(di>=0){
  let ls=c.lastIndexOf(String.fromCharCode(10), di);
  let le=c.indexOf(String.fromCharCode(10), di);
  c=c.slice(0, ls+1)+c.slice(le+1); n++;
} else console.log('miss3');
fs.writeFileSync(P,c); console.log('applied',n,'/3');