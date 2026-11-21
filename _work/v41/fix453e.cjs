const fs = require('fs');
let s = fs.readFileSync('_work/v41/p453.txt', 'utf8');
s = s.split('    items(q.inputs, o);').join('    for (const x of Object.values(q.inputs)) items(x, o);');
fs.writeFileSync('_work/v41/p453.txt', s);
console.log('inputs-object bug fixed');