const fs = require('fs');
let s = fs.readFileSync('_work/v41/mk467.cjs', 'utf8');
s = s.split("indexOf('missing expression')").join("indexOf('parentheses')");
s = s.split("'[P467] missing-expression log at '").join("'[P467] parentheses log at '");
s = s.split("'[P467] missing-expression site NOT found'").join("'[P467] parentheses site NOT found'");
s = s.split("'[P467] lcmp dispatch + eval diagnostic installed'").join("'[P468] lcmp dispatch + parentheses diagnostic installed'");
s = s.split("p467").join("p468");
fs.writeFileSync('_work/v41/mk468.cjs', s);
console.log('mk468 written');