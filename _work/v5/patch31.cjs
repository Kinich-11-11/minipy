const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const D="...vmPrint(E.join(E.str('|KWS=['), E.join(E.var('kws'), E.str(']')))),";
let d=c.indexOf(D); if(d<0){console.log('NODBG');process.exit(1);}
let ls=c.lastIndexOf(String.fromCharCode(10), d); let le=c.indexOf(String.fromCharCode(10), d);
c=c.slice(0,ls+1)+c.slice(le+1); console.log('debug removed');
fs.writeFileSync(P,c);