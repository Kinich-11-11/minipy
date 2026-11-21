const fs=require('fs');
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const only=process.argv[3];
for(const r of j.results){
  if(only && r.name!==only) continue;
  console.log('--- '+r.name+'  err='+JSON.stringify(r.err)+'  status='+r.status+'  steps='+r.steps);
  console.log(r.out.join(' | '));
}
