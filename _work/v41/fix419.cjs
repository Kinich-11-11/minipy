const fs = require('fs');
let s = fs.readFileSync('_work/v41/p419.txt', 'utf8');
const from = "  const ev = () => I('data_variable', { fields: { VARIABLE: ['ev', null] } });";
const to = `  // 复用已有的 ev 变量积木（自造 data_variable 会因变量 id 未声明而被 check41 判错）
  let evId = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode === 'data_variable' && q.fields && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'ev') { evId = id; break; }
  }
  if (!evId) throw new Error('[P419] no existing data_variable(ev) block');
  const ev = () => evId;`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p419.txt', s.replace(from, to));
console.log('ev reporter reuse installed');