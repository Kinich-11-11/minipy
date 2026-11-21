
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
// keep only the LAST write section
const w = s.lastIndexOf('// ---- write ----');
if (w >= 0) {
  const head = s.slice(0, w);
  // does the head still contain a write section?
  const first = head.indexOf('// ---- write ----');
  if (first >= 0) {
    console.log('removing an earlier duplicate write section at', first, 'keeping', w);
    s = head.slice(0, first) + s.slice(w);
    fs.writeFileSync(bp, s);
    console.log('fixed, length', s.length);
  } else {
    console.log('no duplicate found; occurrences:', (s.match(/\/\/ ---- write ----/g) || []).length);
  }
} else console.log('no write marker');
