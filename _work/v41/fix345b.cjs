const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const from = "      callProc('callfn %s %s %s', [\n        item('Tok', argOf('lo')),";
const to = "      callProc('log %s', [JOIN(txt('CHAIN lo='), JOIN(argOf('lo'), JOIN(txt(' close='), VAR('p344close'))))]),\n      callProc('callfn %s %s %s', [\n        item('Tok', argOf('lo')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p345.txt', s.replace(from, to));
console.log('log added');