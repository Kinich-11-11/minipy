const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const M="S.set('kws', E.str('')), S.set('jj', E.num(1)),";
let a=c.indexOf(M); if(a<0){console.log('NOANCHOR');process.exit(1);}
const U="S.Until(E.gt(E.var('i'), E.var('nargs')), [";
let b=c.indexOf(U, a); if(b<0){console.log('NOUNTIL');process.exit(1);}
let ls=c.lastIndexOf(String.fromCharCode(10), a);
let ind=c.slice(ls+1,a); if(ind.trim()!=='') ind='        ';
const rep=ind+"S.set('kws', E.var('cai')),"+String.fromCharCode(13,10);
c=c.slice(0,ls+1)+rep+c.slice(b);
console.log('kws extraction simplified');
fs.writeFileSync(P,c);