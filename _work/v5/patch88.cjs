const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let c=fs.readFileSync(P,'utf8');
const A="    const op = node.op;"+String.fromCharCode(10)+"    const id = this.make(t, op, {});";
const B="    const op = node.op;"+String.fromCharCode(10)+"    if (op === undefined) { console.log('UNDEF NODE key=', JSON.stringify(Object.keys(node)), 'json=', JSON.stringify(node).slice(0,200)); throw new Error('undefined opcode'); }"+String.fromCharCode(10)+"    const id = this.make(t, op, {});";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('diag added'); } else console.log('MISS');
fs.writeFileSync(P,c);