const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const raw = zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8');
for (const needle of ['PCTBRANCH', 'BINDBG', 'SFDBG']) console.log(needle + ': ' + (raw.split(needle).length - 1));