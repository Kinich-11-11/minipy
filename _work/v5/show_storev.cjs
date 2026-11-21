const s=require('fs').readFileSync('_work/v5/kernel/vm.js','utf8');
const i=s.indexOf("is('STOREV'");
console.log(JSON.stringify(s.substr(i, 420)));
