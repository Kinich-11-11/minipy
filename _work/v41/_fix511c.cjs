const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', 'utf8');
const oldBlock = `    const ref = refOf(evIid[0]);
    if (!ref) throw new Error('[P511b] set ev=iid has no input owner');
    const newEv = setV('ev', item('IidSav', llen('IidSav')));
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], newEv, ref.v[2]] : [ref.v[0], newEv];
    BL()[newEv].parent = ref.pid;
    const pop = I('data_deleteoflist', { fields: B.LISTF('IidSav'), inputs: { INDEX: B.REP(llen('IidSav'), [4, '0']) } });
    insertAfterStmt(newEv, [pop]);`;
const newBlock = `    const ref = refOf(evIid[0]);
    if (!ref) throw new Error('[P511b] set ev=iid has no input owner');
    const newEv = setV('ev', item('IidSav', llen('IidSav')));
    const pop = I('data_deleteoflist', { fields: B.LISTF('IidSav'), inputs: { INDEX: B.REP(llen('IidSav'), [4, '0']) } });
    // new chain: read IidSav -> pop -> (the old set ev=iid is DROPPED, but its tail
    // — set evK / set evtype — must stay linked)
    const oldTail = BL()[evIid[0]].next;
    BL()[newEv].next = pop;
    BL()[pop].parent = newEv;
    BL()[pop].next = oldTail;
    if (oldTail) BL()[oldTail].parent = pop;
    BL()[evIid[0]].next = null;
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], newEv, ref.v[2]] : [ref.v[0], newEv];
    BL()[newEv].parent = ref.pid;`;
if (!s.includes(oldBlock)) throw new Error('block not found');
s = s.replace(oldBlock, newBlock);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', s);
console.log('ok');
