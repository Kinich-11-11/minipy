const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('_cov8cases.json', 'utf8'));
const rle = cases[23];
const combos = [
  { name: 'c3+rle', sel: [3, 23] },
  { name: 'c2+c3+rle', sel: [2, 3, 23] },
  { name: 'c1+c3+rle', sel: [1, 3, 23] },
  { name: 'c0+c3+rle', sel: [0, 3, 23] },
  { name: 'c0123+rle', sel: [0, 1, 2, 3, 23] },
];
const fsOut = [];
for (const cb of combos) {
  fs.writeFileSync('_bisect.json', JSON.stringify(cb.sel.map(i => cases[i]), null, 1));
}
console.log(JSON.stringify(combos.map(c => c.sel)));
