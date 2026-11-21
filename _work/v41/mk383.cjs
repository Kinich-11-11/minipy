const fs = require('fs');
let s = fs.readFileSync('_work/v41/p382.txt', 'utf8');
// (1) 增加 CloT 列表
s = s.replace("for (const l of ['CloN', 'CloV', 'CloB', 'CloL', 'FnStack']) B.addList(IT, l, []);",
  "for (const l of ['CloN', 'CloV', 'CloT', 'CloB', 'CloL', 'FnStack']) B.addList(IT, l, []);");
// (2) 捕获时同时快照 Types
s = s.replace("        addTo('CloV', item('Values', VAR('cloI'))),",
  "        addTo('CloV', item('Values', VAR('cloI'))),\n        addTo('CloT', item('Types', VAR('cloI'))),");
// (3) 回退命中时同时恢复 Types
s = s.replace("                addTo('Values', item('CloV', idx())),",
  "                addTo('Values', item('CloV', idx())),\n                addTo('Types', item('CloT', idx())),");
s = s.split('P382').join('P383');
fs.writeFileSync('_work/v41/p383.txt', s);
console.log('wrote p383.txt (Types added)');
