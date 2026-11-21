const fs=require('fs');
const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const want=process.argv.slice(3);
for(const r of rows){ if(want.length&&!want.some(t=>r.tag.startsWith(t))) continue;
  console.log((r.same?'PASS ':'FAIL ')+'['+r.tag+'] '+r.name);
  if(!r.same){ console.log('   mini: '+JSON.stringify(r.mini.out)+(r.mini.err?' err='+JSON.stringify(r.mini.err):'')); console.log('   cpy : '+JSON.stringify(r.py)); }
}
