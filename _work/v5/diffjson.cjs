const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const get = (p) => zipRead(p).find(e => e.name === 'project.json').data.toString('utf8');
const a = get(process.argv[2]), b = get(process.argv[3]);
let i = 0;
while (i < a.length && a[i] === b[i]) i++;
console.log('first difference at char ' + i);
console.log('A: ' + JSON.stringify(a.slice(Math.max(0, i - 120), i + 60)));
console.log('B: ' + JSON.stringify(b.slice(Math.max(0, i - 120), i + 60)));
let diffs = 0, j = i;
while (j < Math.max(a.length, b.length)) { if (a[j] !== b[j]) diffs++; j++; }
console.log('total differing chars: ' + diffs);