const fs = require('fs');
let s = fs.readFileSync('_work/v41/p342.txt', 'utf8');
s = s.replace("    if (!targets.test(ownerOf(id))) continue;", "    // 不做宿主判定（parent 上溯不可靠）；命中就改，并把宿主打出来");
s = s.replace("    n++;\n  }", "    n++;\n    if (n <= 12) console.log('[P342]  #' + n + ' host=' + ownerOf(id) + ' needle=' + JSON.stringify(needle));\n  }");
fs.writeFileSync('_work/v41/p342.txt', s);
console.log('ok: owner filter removed');