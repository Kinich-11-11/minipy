const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
function show(id,d){const b=BL[id];if(!b){console.log(' '.repeat(d)+'?');return;}const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');
 console.log(' '.repeat(d)+b.opcode+(f?'['+f+']':''));for(const [k,v] of Object.entries(b.inputs||{})){if(Array.isArray(v)&&typeof v[1]==='string'&&BL[v[1]]){console.log(' '.repeat(d+2)+k+':');show(v[1],d+4);}else if(Array.isArray(v)&&Array.isArray(v[1])){console.log(' '.repeat(d+2)+k+'='+JSON.stringify(v[1]));}}}
const id='boperat_16npblqp9m';
show(id,0);
