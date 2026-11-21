
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const names=[];
for(const t of P.targets){ for(const [id,v] of Object.entries(t.variables||{})) names.push('V:'+v[0]); for(const [id,v] of Object.entries(t.lists||{})) names.push('L:'+v[0]); }
const uniq=[...new Set(names)];
console.log('total', uniq.length);
const want=['tqacc','tqhcm','tqcpz','tqed','tqek','tqeop','tqlo','tqhi','tqenc','tqn','tqi','tqelem','VStack','lfacc','lfelem','lf','lfn','lfi'];
for(const w of want) console.log(w, uniq.includes('V:'+w)?'VAR-EXISTS':(uniq.includes('L:'+w)?'LIST-EXISTS':'free'));
console.log('lf* vars:', uniq.filter(n=>/^V:lf/.test(n)).join(','));
console.log('listfmt-related lists:', uniq.filter(n=>/^L:/.test(n)).join(','));
