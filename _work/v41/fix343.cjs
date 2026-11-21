const fs = require('fs');
let s = fs.readFileSync('_work/v41/p343.txt', 'utf8');
for (const [a, b] of Object.entries({ cclose: 'ccclose', cd: 'ccd', ci: 'cci', cb: 'ccb' })) {
  s = s.split("'" + a + "'").join("'" + b + "'");
}
fs.writeFileSync('_work/v41/p343.txt', s);
console.log('renamed');