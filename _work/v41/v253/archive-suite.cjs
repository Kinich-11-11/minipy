// Focus on historically passing cases in the checked-in 593-program archive.
// Their frozen CPython transcripts are independent of the patched interpreter.
const fs=require('fs'),path=require('path');const src=require('../_reg232_237.json');const cases=src.filter(c=>c.same&&!c.pyerr&&!c.inputs&&Array.isArray(c.py)&&!c.code.includes('input(')).map(c=>({name:c.name,code:c.code,stdout:c.py.join('\n')}));fs.writeFileSync(process.argv[2],JSON.stringify(cases));console.log(cases.length);
