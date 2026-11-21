const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', 'utf8');
const marker = "  console.log('[P511] class-attr read path uses clsiid (B7)');";
const add = `
  // ctor tail: read this ctor's own instance id from IidSav (pushed at entry) without
  // touching the global iid — the class-attr write path legitimately stores a class
  // name into iid, and the ctor must not inherit it.
  B.addList(IT, 'IidSav', []);
  for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const cf = inDef(pc);
    const adds = find(cf, (b) => b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'InstCls');
    if (adds.length !== 1) throw new Error('[P511b] ' + pc + ' InstCls adds = ' + adds.length);
    {
      const nx = BL()[adds[0]].next;
      const push = addTo('IidSav', VAR('iid'));
      BL()[adds[0]].next = push; BL()[push].parent = adds[0];
      BL()[push].next = nx; if (nx) BL()[nx].parent = push;
    }
    const isIidRef = (v) => v && (typeof v[1] === 'string'
      ? (BL()[v[1]] && BL()[v[1]].opcode === 'data_variable' && BL()[v[1]].fields.VARIABLE[0] === 'iid')
      : (Array.isArray(v[1]) && v[1][0] === 12 && v[1][1] === 'iid'));
    const seen = [];
    const stack = [adds[0]];
    const visited = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (!id || visited.has(id) || !BL()[id]) continue;
      visited.add(id);
      const b = BL()[id];
      seen.push(id);
      if (b.opcode === 'control_stop') continue;
      if (b.next) stack.push(b.next);
      for (const v of Object.values(b.inputs || {})) {
        if (Array.isArray(v) && typeof v[1] === 'string' && (v[0] === 2)) stack.push(v[1]);
      }
    }
    const evIid = seen.filter((id) => BL()[id].opcode === 'data_setvariableto'
      && BL()[id].fields.VARIABLE[0] === 'ev' && isIidRef(BL()[id].inputs.VALUE));
    if (evIid.length !== 1) throw new Error('[P511b] ' + pc + ' set ev=iid = ' + evIid.length);
    const ref = refOf(evIid[0]);
    if (!ref) throw new Error('[P511b] set ev=iid has no input owner');
    const newEv = setV('ev', item('IidSav', llen('IidSav')));
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], newEv, ref.v[2]] : [ref.v[0], newEv];
    BL()[newEv].parent = ref.pid;
    const pop = I('data_deleteoflist', { fields: B.LISTF('IidSav'), inputs: { INDEX: B.REP(llen('IidSav'), [4, '0']) } });
    insertAfterStmt(newEv, [pop]);
  }
  console.log('[P511] ctor tail reads IidSav (B7/B8)');`;
if (!s.includes(marker)) throw new Error('marker not found');
s = s.replace(marker, add);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', s);
console.log('ok');
