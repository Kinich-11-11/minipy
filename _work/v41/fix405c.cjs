const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const from = [
  "      IF(EQ(VAR('error'), txt('')), [",
  "        setV('mkdfv', VAR('ev')),",
  "        setV('mkdft', VAR('evtype'))",
  "      ]),",
  "      setV('error', txt('')),",
  "      setV('mkhi', ADD(argOf('lo'), num(1)))"
].join('\n');
const to = [
  "      IF(EQ(VAR('error'), txt('')), [",
  "        setV('mkdfv', VAR('ev')),",
  "        setV('mkdft', VAR('evtype'))",
  "      ]),",
  "      setV('error', txt('')),",
  "      // 关键：把 ev/evtype 恢复成\"可迭代对象本身\"（路径随后要按 L/S/D 分派），",
  "      // 答案只留在 mkdfv/mkdft 里。",
  "      callProc('eval %s %s', [ADD(argOf('lo'), num(2)), VAR('mmsv')]),",
  "      setV('error', txt('')),",
  "      setV('mkhi', ADD(argOf('lo'), num(1)))"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p405.txt', s.replace(from, to));
console.log('iterable restore added');