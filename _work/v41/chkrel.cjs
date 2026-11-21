const fs = require('fs');
const t = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
for (const v of ['v4.186', 'v4.185']) {
  const m = t.match(new RegExp("'" + v + "'=\"([^\"]*)\""));
  if (m) {
    const parts = m[1].split(',');
    console.log(v + ' count=' + parts.length + ' last8=' + parts.slice(-8).join(','));
  } else console.log(v + ' : not found');
}
console.log('p419 defs=' + (t.match(/\$p419\s*=/g) || []).length);
console.log('p396 defs=' + (t.match(/\$p396\s*=/g) || []).length);
