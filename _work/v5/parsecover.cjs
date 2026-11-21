const fs=require('fs');
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let ok=0; const errs={};
for(const r of j.results){ if(!r.err||r.err==='0'||r.err==='') ok++; else { const k=r.err.replace(/:.*/,''); errs[k]=(errs[k]||0)+1; } }
console.log('parsed without error: '+ok+'/'+j.results.length);
console.log('errors: '+JSON.stringify(errs));
for(const r of j.results) if(r.err&&r.err!=='0'&&r.err!=='') console.log('  '+r.name.padEnd(17)+r.err.slice(0,70));
