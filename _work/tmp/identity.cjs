const fs=require('fs'), cp=require('child_process'), crypto=require('crypto');
function pj(sb3,out){ fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  return fs.readFileSync(out+'/project.json','utf8'); }
const a=pj('MiniPy_v5.sb3','_work/tmp/ia'), b=pj('_work/v5/rebuild.sb3','_work/tmp/ib');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
console.log('shipped project.json', a.length, h(a).slice(0,32));
console.log('rebuilt project.json', b.length, h(b).slice(0,32));
console.log('IDENTICAL:', a===b);
if(a!==b){ let i=0; while(i<a.length&&i<b.length&&a[i]===b[i]) i++; console.log('first difference at char',i); console.log('shipped:', JSON.stringify(a.slice(i-120,i+160))); console.log('rebuilt:', JSON.stringify(b.slice(i-120,i+160))); }
console.log('sb3 bytes: shipped', fs.statSync('MiniPy_v5.sb3').size, 'rebuilt', fs.statSync('_work/v5/rebuild.sb3').size);
