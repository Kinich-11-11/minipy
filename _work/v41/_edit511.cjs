const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', 'utf8');
const oldM = `    && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][0] === 3
    && JSON.stringify(b.inputs.VALUE[1]).includes('"Tok"')
    && JSON.stringify(b.inputs.VALUE[1]).includes('"lo"'));`;
const newM = `    && b.inputs.VALUE && typeof b.inputs.VALUE[1] === 'string'
    && BL()[b.inputs.VALUE[1]] && BL()[b.inputs.VALUE[1]].opcode === 'data_itemoflist'
    && BL()[b.inputs.VALUE[1]].fields.LIST[0] === 'Tok');`;
if (!s.includes(oldM)) throw new Error('matcher not found');
s = s.replace(oldM, newM);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', s);
console.log('matcher updated');
