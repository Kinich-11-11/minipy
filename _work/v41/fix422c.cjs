const fs = require('fs');
let s = fs.readFileSync('_work/v41/p422.txt', 'utf8');
const from = "  const second = preds[0];";
const to = "  const second = preds.filter((id) => procOf(id).indexOf('listitem') === 0)[0] || preds[0];";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p422.txt', s.replace(from, to));
console.log('predicate prefers listitem predecessor');