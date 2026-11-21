const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const f=dir+'p25.txt';
let t=fs.readFileSync(f,'utf8');
const a="for (const v of ['bt_r', 'bt_p', 'bt_a', 'bt_b', 'bt_ab', 'bt_bb', 'bt_bit', 'bti']) newVar(v, 0);";
const b="for (const v of ['bt_r', 'bt_p', 'bt_a', 'bt_b', 'bt_ab', 'bt_bb', 'bt_bit', 'bti', 'evtsave']) newVar(v, 0);";
if(!t.includes(a)) throw new Error('newVar line not found');
fs.writeFileSync(f, t.replace(a,b));
console.log('evtsave declared');
