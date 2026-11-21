
const fs = require('fs');
for (const f of ['8086','py']) {
  const s = JSON.parse(fs.readFileSync('D:\\编程\\scratch\\ai\\minipython\\_work\\analyze_sb3\\' + f + '.summary.json','utf8'));
  console.log('##### ' + f + ' opcode histogram (top 60)');
  console.log(s.opcodeHistogram.slice(0,60).map(x=>x[0]+' x'+x[1]).join('\n'));
  console.log('');
}
