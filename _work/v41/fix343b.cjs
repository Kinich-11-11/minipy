const fs = require('fs');
let s = fs.readFileSync('_work/v41/p343.txt', 'utf8');
for (const [a, b] of Object.entries({ ccclose: 'p343close', ccd: 'p343d', cci: 'p343i', ccb: 'p343b' })) {
  s = s.split("'" + a + "'").join("'" + b + "'");
}
fs.writeFileSync('_work/v41/p343.txt', s);
console.log('renamed to p343*');