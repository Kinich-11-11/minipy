
import { execFileSync } from 'child_process';
import fs from 'fs';
const f='D:/编程/scratch/ai/minipython/_work/v5test/_t.py';
fs.writeFileSync(f,'print(1+2)\n');
try{ const o=execFileSync('python',[f],{encoding:'utf8'}); console.log('OK',JSON.stringify(o)); }
catch(e){ console.log('FAIL message=',e.message.slice(0,300)); console.log('status',e.status,'code',e.code); console.log('stdout=',JSON.stringify(e.stdout)); console.log('stderr=',JSON.stringify(e.stderr)); }
try{ const o2=execFileSync('python',['-c','print(9)'],{encoding:'utf8'}); console.log('OK2',JSON.stringify(o2)); }catch(e){ console.log('FAIL2',e.message.slice(0,200)); }
