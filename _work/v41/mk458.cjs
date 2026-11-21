const fs = require('fs');
let s = fs.readFileSync('_work/v41/p456.txt', 'utf8');
const from = "    setV('evK', txt('')),\n    setV('evtype', txt('L')),\n    replaceItem('ItPos', VAR('lgi'), ADD(VAR('lgn'), num(1)))\n  ];";
const to = "    setV('evK', txt('')),\n    setV('evtype', txt('L'))\n    // 注意：**不要**在这里推进 ItPos —— 实测同一次 `list(...)` 会被内部读两次，\n    // 推进会让第二次读到空表（`_g2` n2 曾因此回归）。只做\"已耗尽 ⇒ 空表\"的判断。\n  ];";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P456').join('P458');
fs.writeFileSync('_work/v41/p458.txt', s);
console.log('advance removed');