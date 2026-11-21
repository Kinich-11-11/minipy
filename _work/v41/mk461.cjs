const fs = require('fs');
let s = fs.readFileSync('_work/v41/p456.txt', 'utf8');   // P456 = 含推进的版本（rawCall + Y 体改写 + advance）
s = s.split('P456').join('P461');
fs.writeFileSync('_work/v41/p461.txt', s);
console.log('p461 written from p456');