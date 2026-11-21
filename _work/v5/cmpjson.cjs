const crypto = require('crypto');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const hashOf = (p) => {
  const j = zipRead(p).find(e => e.name === 'project.json').data;
  return { len: j.length, sha: crypto.createHash('sha256').update(j).digest('hex') };
};
const a = hashOf(process.argv[2]), b = hashOf(process.argv[3]);
console.log('shipped  project.json: ' + a.len + ' bytes  ' + a.sha);
console.log('rebuild  project.json: ' + b.len + ' bytes  ' + b.sha);
console.log('project.json identical: ' + (a.sha === b.sha));