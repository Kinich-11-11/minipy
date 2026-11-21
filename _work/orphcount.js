'use strict';
const fs=require('fs');
const p=process.argv[2];
const P=JSON.parse(fs.readFileSync(p,'utf8'));
let n=0;
for(const T of P.targets){ let o=0; for(const [id,b] of Object.entries(T.blocks)){ if((b.parent===undefined||b.parent===null) && !b.topLevel) o++; } if(o) console.log(T.name,'orphans',o); n+=o; }
console.log('total orphans',n);
