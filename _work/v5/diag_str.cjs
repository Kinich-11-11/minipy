const fs=require('fs');
const c=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js','utf8');
const lines=c.split(String.fromCharCode(10));
for(let i=0;i<lines.length;i++){
  if(lines[i].indexOf("E.str('*')")>=0){ console.log('LINE',i+1,JSON.stringify(lines[i])); console.log('  next:',JSON.stringify(lines[i+1]||'')); }
}
console.log('total lines',lines.length);