// P123's `fv` collides; use wpval
const fs = require('fs');
const f = 'D:/编程/scratch/ai/minipython/_work/v41/p123.txt';
let t = fs.readFileSync(f, 'utf8');
t = t.replace("'fret', 'fdest', 'fv', 'fvt', 'fdef'", "'fret', 'fdest', 'wpval', 'fvt', 'fdef'");
t = t.split("F('fv')").join("F('wpval')");
t = t.split("'fv'").join("'wpval'");
fs.writeFileSync(f, t);
console.log('bare fv left: ' + (t.match(/\bfv\b/g) || []).length);
