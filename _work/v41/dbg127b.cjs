// temporary: log the receiver of the explicit Class.m(inst, ...) hook
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);", "  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", 'dbgl');
rep(`        setV('cup', VAR('ev')),`, `        setV('cup', VAR('ev')),
        addTo('DbgL', JOIN(txt('am '), JOIN(tokAt(argOf('lo')), JOIN(txt('.'), JOIN(tokAt(ADD(argOf('lo'), num(2))), JOIN(txt(' arg1='), JOIN(tokAt(ADD(argOf('lo'), num(4))), JOIN(txt(' cup='), VAR('cup'))))))))),`, 'log');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
