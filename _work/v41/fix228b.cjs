const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "'fcomma', 'fd'].forEach";
const to = "'fcomma', 'fd', 'augrp', 'augnames', 'aui2'].forEach";
if (!s.includes(from)) { console.log('MISS vars'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok vars');
