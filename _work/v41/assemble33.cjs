const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const part=(p)=>{ let t=fs.readFileSync(dir+p,'utf8').replace(/\r/g,'').trimEnd();
  if(p==='tail.txt'){ const i=t.indexOf('// ---- DEBUG'); if(i>=0) t=t.slice(i); }
  return t; };
const parts=['head.txt','p13.txt','p14.txt','p15.txt','p17.txt','p18.txt','p19.txt','p20.txt','p21.txt','p23.txt','p24.txt','p25.txt','p26.txt','p27.txt','p28.txt','p29.txt','p30.txt','p31.txt','p32.txt','p33.txt','p34.txt','p38.txt','p46.txt','p47.txt','p48.txt','tail.txt'];
fs.writeFileSync(dir+'build33.js', parts.map(part).join('\n\n')+'\n');
console.log('assembled -> '+fs.readFileSync(dir+'build33.js','utf8').split('\n').length+' lines');