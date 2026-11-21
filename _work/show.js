
const fs = require('fs');
const s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build.js', 'utf8').split('\n');
for (let i = 155; i < 200; i++) console.log((i + 1) + ': ' + s[i]);
