
import fs from 'fs';
import { execFileSync } from 'child_process';
const cases=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const f='D:/编程/scratch/ai/minipython/_work/v5test/_t2.py';
const out=[];
for(const c of cases){
  fs.writeFileSync(f, c.code+'\n');
  let o='';
  try{ o=execFileSync('C:/Users/69241/AppData/Local/Programs/Python/Python314/python.exe',[f],{encoding:'utf8',timeout:10000}); }
  catch(e){ o=(e.stdout||'')+''; }
  out.push({name:c.name, out:o.replace(/\r/g,'').split('\n').filter((x,i,a)=>!(i===a.length-1&&x===''))});
}
console.log(JSON.stringify(out));
