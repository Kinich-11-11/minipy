const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
// 找 listlit 定义
const defs = Object.keys(B).filter((id) => {
  const b = B[id];
  if (b.opcode !== 'procedures_definition') return false;
  const pr = B[b.inputs.custom_block[1]];
  return pr && pr.mutation && String(pr.mutation.proccode) === 'listlit %s %s';
});
console.log('listlit defs=' + defs.length);
const texts = (id, d, out) => {
  if (!id || d > 10 || typeof id !== 'string') return out;
  const q = B[id];
  if (!q) return out;
  if (q.opcode === 'text') out.push(String(q.fields.TEXT[0]));
  if (q.opcode === 'data_variable') out.push('$' + q.fields.VARIABLE[0]);
  if (q.opcode === 'argument_reporter_string_number') out.push('#' + q.fields.VALUE[0]);
  for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') texts(v[1], d + 1, out);
  return out;
};
const walk = (id, cb, d) => {
  if (!id || d > 60 || typeof id !== 'string') return;
  const q = B[id];
  if (!q) return;
  cb(id, q);
  for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') walk(v[1], cb, d + 1);
  walk(q.next, cb, d + 1);
};
for (const def of defs) {
  const body = B[def].next;
  let n = 0;
  walk(body, (id, q) => {
    if (q.opcode !== 'control_if' && q.opcode !== 'control_if_else') return;
    n++;
    const cond = q.inputs.CONDITION ? texts(q.inputs.CONDITION[1], 0, []).join(' ') : '';
    const lists = [];
    const sub = q.inputs.SUBSTACK ? q.inputs.SUBSTACK[1] : null;
    walk(sub, (sid, sq) => {
      if (sq.opcode === 'data_addtolist' || sq.opcode === 'data_deletealloflist' || sq.opcode === 'data_replaceitemoflist') {
        lists.push(sq.opcode.replace('data_', '') + ':' + (sq.fields.LIST ? sq.fields.LIST[0] : '?'));
      }
    }, 0);
    console.log('#' + n + ' cond=(' + cond.slice(0, 90) + ')  -> ' + lists.join(','));
  }, 0);
}
