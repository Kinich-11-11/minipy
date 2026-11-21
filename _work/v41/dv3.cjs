// dv3.cjs <procSubstr> <listName> —— 找出写入该列表的块的最外层公共祖先（用于整体加守卫）
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.env.V41_JSON || '_work/v41/_p192proj.json', 'utf8'));
const BB = p.targets.find((t) => t.name === 'Interpreter').blocks;
const proc = process.argv[2] || 'calluser';
const listName = process.argv[3] || 'UArgV';
const desc = (v, d) => {
  if (!Array.isArray(v) || d > 6) return '?';
  if (v[0] === 12) return String(v[2] || v[1]);
  if (typeof v[1] === 'string' && BB[v[1]]) {
    const q = BB[v[1]];
    let s = q.opcode.replace(/^(operator_|data_|argument_|control_)/, '');
    if (q.fields) for (const k of Object.keys(q.fields)) { const f = q.fields[k]; if (Array.isArray(f) && f[0] != null && !Array.isArray(f[0])) s += '(' + f[0] + ')'; }
    if (q.opcode === 'argument_reporter_string_number' && q.fields && q.fields.VALUE) s = 'ARG(' + q.fields.VALUE[0] + ')';
    const kids = Object.values(q.inputs || {}).map((x) => desc(x, d + 1)).filter((x) => x !== '?');
    return s + (kids.length ? '[' + kids.join(',') + ']' : '');
  }
  if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') return JSON.stringify(String(v[1]));
  if (Array.isArray(v[1])) return desc(v[1], d + 1);
  return '?';
};
const line = (id) => {
  const q = BB[id];
  if (!q) return '?';
  let s = q.opcode.replace(/^(data_|control_|procedures_)/, '') + (q.fields && q.fields.LIST ? ' L=' + q.fields.LIST[0] : '') + (q.mutation ? ' «' + String(q.mutation.proccode) + '»' : '');
  if (q.inputs) for (const [k, v] of Object.entries(q.inputs)) { if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue; s += '  ' + k + '=' + desc(v, 0).slice(0, 60); }
  return s;
};
let defId = null;
for (const id of Object.keys(BB)) {
  const b = BB[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
  const pr = BB[b.inputs.custom_block[1]];
  if (pr && String(pr.mutation.proccode).indexOf(proc) >= 0) { defId = id; break; }
}
const chains = [];
const walk = (id, chain) => {
  let c = id;
  while (c) {
    const q = BB[c];
    if (!q) break;
    const isWrite = (q.opcode === 'data_addtolist' || q.opcode === 'data_replaceitemoflist')
      && q.fields && q.fields.LIST && q.fields.LIST[0] === listName;
    // 排除我们自己的值槽（它的祖先是 IFELSE(len(UArgV)==0)）
    const isOwn = chain.some((a) => a && BB[a].inputs && BB[a].inputs.CONDITION && JSON.stringify(BB[a].inputs.CONDITION).indexOf('lengthoflist') >= 0 && JSON.stringify(BB[a].inputs.CONDITION).indexOf(listName) >= 0);
    if (isWrite && !isOwn) chains.push(chain.slice());
    for (const [k, v] of Object.entries(q.inputs || {})) {
      if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1], chain.concat([c]));
    }
    c = q.next;
  }
};
walk(BB[defId].next, []);
console.log('build-write chains: ' + chains.length);
if (chains.length) {
  const first = chains[0];
  let common = first[first.length - 1];
  for (let i = first.length - 1; i >= 0; i--) {
    const cand = first[i];
    if (chains.every((ch) => ch.indexOf(cand) >= 0)) { common = cand; break; }
  }
  console.log('outermost common ancestor = ' + common + ' :: ' + line(common).slice(0, 160));
  const idx = first.indexOf(common);
  console.log('its chain (from that ancestor):');
  for (let i = idx; i < first.length; i++) console.log('   ' + (i === idx ? '*' : ' ') + first[i] + ' :: ' + line(first[i]).slice(0, 130));
}
