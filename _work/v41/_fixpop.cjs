const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', 'utf8');
const marker = "    // POP-DISABLED-FOR-TEST";
if (!s.includes(marker)) throw new Error('disabled marker not found');
const replacement = `    // the pop goes INSIDE the error-if as its new head (refOf/input rewrite — the
    // chain-predecessor route is unsafe: shared .next owners corrupted callfnW)
    {
      const ref = refOf(evIid[0]);
      if (!ref) throw new Error('[P511] set ev=iid has no input owner');
      const popFirst = chain([
        setV('iid', item('IidSav', llen('IidSav'))),
        I('data_deleteoflist', { fields: B.LISTF('IidSav'), inputs: { INDEX: B.REP(llen('IidSav'), [4, '0']) } })
      ]);
      let tail2 = popFirst;
      while (BL()[tail2].next) tail2 = BL()[tail2].next;
      BL()[tail2].next = evIid[0];
      BL()[evIid[0]].parent = tail2;
      BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], popFirst, ref.v[2]] : [ref.v[0], popFirst];
      BL()[popFirst].parent = ref.pid;
    }`;
s = s.replace(marker, replacement);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', s);
console.log('pop restored via input rewrite');
