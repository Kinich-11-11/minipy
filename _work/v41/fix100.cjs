const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz100.txt', 'utf8');
const from = "        callProc('log %s', [JOIN(txt(tag + ' in ' + ownerOf(id) + ' hl='), JOIN(VAR('head'), JOIN(txt('/'), VAR('count'))))])";
const to = "        callProc('log %s', [JOIN(txt('EID ' + id + ' in ' + ownerOf(id) + ' '), JOIN(VAR('head'), JOIN(txt('/'), VAR('count'))))])";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/pz100.txt', s.replace(from, to));
console.log('ok: markers now log the site id');