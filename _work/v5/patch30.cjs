const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const M="S.If(E.eq(bn(), E.str('print|00000')), [";
const U="S.Until(E.gt(E.var('i'), E.var('nargs')), [";
let a=c.indexOf(M); if(a<0){console.log('NOANCHOR');process.exit(1);}
let b=c.indexOf(U, a); if(b<0){console.log('NOUNTIL');process.exit(1);}
let ls=c.lastIndexOf(String.fromCharCode(10), b);
let ind=c.slice(ls+1,b); if(ind.trim()!=='') ind='        ';
const dbg=ind+"...vmPrint(E.join(E.str('|KWS=['), E.join(E.var('kws'), E.str(']')))),"+String.fromCharCode(13,10);
c=c.slice(0,ls+1)+dbg+c.slice(ls+1); console.log('inserted debug');
fs.writeFileSync(P,c);