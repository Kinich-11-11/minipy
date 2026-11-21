const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const from = "      setV('mmsv', VAR('mkhi')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "      setV('p4list', txt('')),      // 清掉上一次调用留下的元素列表（否则 minkey 会当成非空）",
  "      setV('mmsv', VAR('mkhi')),"
].join('\n'));
fs.writeFileSync('_work/v41/p405.txt', s);
console.log('p4list reset added');