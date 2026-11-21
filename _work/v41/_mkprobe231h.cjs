// mkprobe231h.cjs -- isolate the import regression
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'imp_only', code: 'import datetime\nprint(1)' },
  { name: 'imp_use', code: 'import datetime\nprint(datetime.date(2024, 1, 15))' },
  { name: 'imp_twice', code: 'import datetime\nimport re\nprint(datetime.date(2024, 1, 15))' },
  { name: 'no_import', code: 'print(2 + 3)' },
  { name: 'from_imp', code: 'from math import sqrt\nprint(sqrt(16))' }
];
fs.writeFileSync('_work/v41/_probe231h.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
