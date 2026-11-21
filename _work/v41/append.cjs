const fs=require('fs');
const f='D:/编程/scratch/ai/minipython/_work/v41/build41.js';
const body=fs.readFileSync(f,'utf8');
const tail=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/tail.txt','utf8');
if(!body.trimEnd().endsWith('];')) throw new Error('unexpected tail: '+body.trimEnd().slice(-80));
fs.writeFileSync(f, body.trimEnd()+'
'+tail);
console.log('appended '+tail.split('
').length+' lines; total now '+fs.readFileSync(f,'utf8').split('
').length);
