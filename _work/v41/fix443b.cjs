const fs = require('fs');
let s = fs.readFileSync('_work/v41/p443.txt', 'utf8');
const bad = "      setV('cfull', JOIN(JOIN(VAR('ccls'), txt('.')), txt('__lt__')))],";
const good = "      setV('cfull', JOIN(JOIN(VAR('ccls'), txt('.')), txt('__lt__')))\n    ]),";
if (!s.includes(bad)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p443.txt', s.replace(bad, good));
console.log('paren fixed');