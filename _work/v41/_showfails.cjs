const fs = require('fs');
const d = process.argv[2] || '_v216main/';
let tot = 0, fails = 0;
for (const f of fs.readdirSync(d)) {
  if (!f.endsWith('.out.json')) continue;
  const r = JSON.parse(fs.readFileSync(d + f, 'utf8'));
  tot += r.length;
  for (const c of r) {
    if (!c.same) {
      fails++;
      console.log('###', f, c.name);
      console.log('code:', String(c.code).split('\n').join(' | ').slice(0, 320));
      console.log('mini:', JSON.stringify(c.mini.out).slice(0, 160), c.mini.err ? 'ERR ' + c.mini.err : '');
      console.log('py  :', JSON.stringify(c.py).slice(0, 160));
      console.log();
    }
  }
}
console.log('cases:', tot, 'fails:', fails);
