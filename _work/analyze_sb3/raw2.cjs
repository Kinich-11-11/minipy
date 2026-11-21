
const fs=require('fs');
const dir=process.argv[2];
const names=['escape_nl','type_int','print_true','substr_in','empty_in','str_compare','round2','long_sum','list_literal','neg_index_err','multi_print'];
for(const f of ['expected.json','res_pi.json','res_v4new.json','res_v41.json','res_v4.json']){
  let raw=JSON.parse(fs.readFileSync(dir+'\\'+f,'utf8'));
  const isObj=!Array.isArray(raw) && !raw.results;
  console.log('### '+f+(isObj?' (object)':''));
  for(const n of names){
    let x;
    if(isObj){ x=raw[n]; if(x) console.log('  '+n+' => out='+JSON.stringify(x.out)+' err='+JSON.stringify(x.err)); }
    else { x=raw.results.find(y=>y.name===n); if(x) console.log('  '+n+' => out='+JSON.stringify(x.out)+' err='+JSON.stringify(x.err)); }
  }
  console.log('');
}
