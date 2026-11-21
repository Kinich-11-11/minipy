const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/v41/';
const full = fs.readFileSync(dir + 'build41.js', 'utf8');
const dbgFile = process.argv[2] || '_dbg506.js';
const dbg = fs.readFileSync(dir + dbgFile, 'utf8');
// build41.js = [parts...] where tail.txt contributed from '// ---- DEBUG' onward;
// find the DEBUG marker (the patch runner) and insert dbg before it
const i = full.indexOf('// ---- DEBUG');
if (i < 0) throw new Error('DEBUG marker not found');
fs.writeFileSync(dir + 'build_dbg.js', full.slice(0, i) + dbg + '\n\n' + full.slice(i));
console.log('build_dbg.js written from ' + dbgFile);
