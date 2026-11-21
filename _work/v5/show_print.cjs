const s=require('fs').readFileSync('_work/v5/kernel/vm.js','utf8');
const i=s.indexOf("S.set('out', E.str(''))");
console.log('idx', i);
console.log(JSON.stringify(s.substr(i-120, 520)));
