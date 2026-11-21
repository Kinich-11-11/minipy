const fs = require('fs');
let s = fs.readFileSync('_work/v41/p319.txt', 'utf8');
// 把 v4 的"自己 assign self + calluser"换成 v1 的 callmeth（但保留包裹式，不用 stopThis）
const from = s.slice(s.indexOf("      setV('adone', num(1)),"), s.indexOf("    ]),\n    wrapper"));
const to = [
  "      setV('adone', num(1)),",
  "      callProc('callmeth %s %s %s %s', [argOf('leftval'), txt('__add__'), argOf('lo'), argOf('hi')])",
  ""
].join('\n');
s = s.replace(from, to);
s = s.replace("patch('P319 A() + B() honours __add__ (direct calluser)'", "patch('P319 A() + B() honours __add__ (callmeth + wrapped body)'");
fs.writeFileSync('_work/v41/p319.txt', s);
console.log('rewrote p319.txt (callmeth + wrap)');