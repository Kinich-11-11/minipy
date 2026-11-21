const s=require('fs').readFileSync('_work/v5/kernel/vm.js','utf8');
const i=s.indexOf("'tv2'");
console.log('idx', i);
console.log(s.substr(Math.max(0,i-800), 1000));
