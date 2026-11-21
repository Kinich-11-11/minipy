const fs = require('fs');
const f = '_work/v41/p131.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
// the type argument is delimited by *indices* (tqcpz + 1 .. hi - 1), not by token values
rep(`        ...collect(tok(ADD(VAR('tqcpz'), num(1))), tok(SUB(argOf('hi'), num(1)))),`,
  `        ...collect(ADD(VAR('tqcpz'), num(1)), SUB(argOf('hi'), num(1))),`, 'issubclass range');
rep(`        ...collect(tok(ADD(VAR('tqcpz'), num(1))), tok(SUB(argOf('hi'), num(1)))),`,
  `        ...collect(ADD(VAR('tqcpz'), num(1)), SUB(argOf('hi'), num(1))),`, 'isinstance range');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
