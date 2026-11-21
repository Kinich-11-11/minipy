const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
for(const p of ['head.txt','p13.txt','p14.txt','p15.txt','p17.txt','p18.txt','tail.txt']){
  const t=fs.readFileSync(dir+p,'utf8').replace(/\r/g,'');
  const lines=t.split('\n');
  console.log(p+' lines='+lines.length+' first='+JSON.stringify(lines[0].slice(0,50))+' last='+JSON.stringify(lines[lines.length-1].slice(0,40)));
}
const b=fs.readFileSync(dir+'build41.js','utf8').split('\n');
console.log('--- assembled around 1880-1895 ---');
for(let i=1878;i<1896&&i<b.length;i++) console.log((i+1)+': '+b[i].slice(0,110));
