const fs = require('fs');
const f = '_work/v41/p128.txt';
let t = fs.readFileSync(f, 'utf8');
const map = [['ssh1', 'p2sh1'], ['ssh2', 'p2sh2'], ['isv', 'p2v'], ['ist', 'p2t'], ['isn', 'p2n'],
  ['isr', 'p2r'], ['isc1', 'p2c1'], ['isc2', 'p2c2'], ['iscur', 'p2cur'], ['iscnt', 'p2cnt']];
for (const [a, b] of map) {
  const re = new RegExp("'" + a + "'", 'g');
  const n = (t.match(re) || []).length;
  t = t.replace(re, "'" + b + "'");
  console.log(a + ' -> ' + b + ' : ' + n);
}
fs.writeFileSync(f, t);
