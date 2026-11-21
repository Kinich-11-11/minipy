const fs=require('fs');
const p='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
const src=fs.readFileSync(p,'utf8');
const lines=src.split('\n');
console.log('lines',lines.length,'bytes',src.length);
// bracket scan
let depth=0; const marks=[];
for(let i=0;i<lines.length;i++){
  const s=lines[i]; let d=0,inStr=null;
  for(let k=0;k<s.length;k++){ const c=s[k];
    if(inStr){ if(c==='\\'){k++;continue;} if(c===inStr) inStr=null; continue; }
    if(c==="'"||c==='"'||c==='\`'){inStr=c;continue;}
    if('([{'.includes(c)) d++; else if(')]}'.includes(c)) d--;
  }
  depth+=d;
  if(/^(  )?(function |  return \[|})/.test(s)) marks.push((i+1)+' d='+depth+' '+s.trim().slice(0,40));
}
console.log('FINAL DEPTH',depth);
console.log(marks.slice(-14).join('\n'));
console.log('--- last 6 lines ---');
console.log(lines.slice(-6).map((l,i)=>(lines.length-5+i)+': '+l).join('\n'));
console.log('--- has dispatch/initBody/setup? ---');
console.log('dispatch',src.includes('function dispatch'),'initBody',src.includes('function initBody'),'setup',src.includes('function setup'),'exports',src.includes('module.exports'));
