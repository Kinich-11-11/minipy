const fs = require('fs');
let s = fs.readFileSync('_work/v41/p420.txt', 'utf8');
s = s.replace("        LOGX(JX(txt('S vt='), argOf('vt'), txt(' vv=['), argOf('vv'), txt(']')))",
              "        LOGX(JX(txt('S vt='), argOf('vt'), txt(' mode=['), VAR('mode'), txt('] vv=['), argOf('vv'), txt(']')))");
// 额外：在 strval 的对象兜底赋值之前记录 mode
s = s.replace("  console.log('[P420] strval probe installed');", `  {
    const defId = defIdOf('strval %s %s');
    const textsOf = (q) => { const out = []; const rec = (v) => { if (!Array.isArray(v)) return; if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') out.push(String(v[1])); else if (typeof v[1] === 'string' && BB[v[1]]) { const w = BB[v[1]]; if (w.inputs) for (const x of Object.values(w.inputs)) rec(x); } else if (Array.isArray(v[1])) rec(v[1]); }; for (const x of Object.values(q.inputs || {})) rec(x); return out.join('|'); };
    let fb = null;
    const walk = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; if (q.opcode === 'data_setvariableto' && q.fields && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'ev' && textsOf(q).indexOf(' object>') >= 0) fb = c; for (const [k, v] of Object.entries(q.inputs || {})) { if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]); } c = q.next; } };
    walk(BB[defId].next);
    if (fb) { insertBeforeStmt(fb, [LOGX(JX(txt('FB mode=['), VAR('mode'), txt('] p3x='), VAR('p3x'), txt(' vt='), argOf('vt')))]); console.log('[P420] fallback probe at ' + fb); }
    else console.log('[P420] fallback not found');
  }
  console.log('[P420] strval probe installed');`);
s = s.split('P420').join('P421');
fs.writeFileSync('_work/v41/p421.txt', s);
console.log('wrote p421.txt');