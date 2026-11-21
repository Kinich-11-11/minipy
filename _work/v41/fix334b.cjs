const fs = require('fs');
let s = fs.readFileSync('_work/v41/p334.txt', 'utf8');
s = s.split(' B[').join(' BB[');
s = s.split('(B[').join('(BB[');
s = s.split('? B[').join('? BB[');
s = s.split('=B[').join('=BB[');
fs.writeFileSync('_work/v41/p334.txt', s);
const left = (s.match(/[^B.]B\[/g) || []).length;
console.log('remaining single-B index uses: ' + left);