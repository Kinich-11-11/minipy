// add `expectError` to the named cases of a probe (uncaught errors are expected there)
const fs = require('fs');
const file = process.argv[2];
const names = process.argv[3].split(',');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0;
for (const c of j) if (names.some((x) => c.name.startsWith(x))) { c.expectError = 1; n++; }
fs.writeFileSync(file, JSON.stringify(j, null, 1));
console.log('flagged ' + n + ' in ' + file);
