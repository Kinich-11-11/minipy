const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz102.txt', 'utf8');
const start = s.indexOf('  insertBeforeStmt(site, [');
const end = s.indexOf('  console.log(\'[PZ102] probe installed\');');
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
const repl = [
  '  // 该站点是分支里的第一条语句，insertBeforeStmt 用不了 -> 手工把日志链接到分支头',
  '  const logs = [',
  "    callProc('log %s', [JOIN(txt('F fplo='), VAR('fplo'))]),",
  "    callProc('log %s', [JOIN(txt('F Tok[fplo]=['), JOIN(item('Tok', VAR('fplo')), txt(']')))]),",
  "    callProc('log %s', [JOIN(txt('F fphi='), VAR('fphi'))]),",
  "    callProc('log %s', [JOIN(txt('F Tok[fphi]=['), JOIN(item('Tok', VAR('fphi')), txt(']')))]),",
  "    callProc('log %s', [JOIN(txt('F count='), VAR('count'))]),",
  "    callProc('log %s', [JOIN(txt('F head='), VAR('head'))])",
  '  ];',
  '  const headId = logs[0];',
  '  for (let i = 0; i + 1 < logs.length; i++) { BB[logs[i]].next = logs[i + 1]; BB[logs[i + 1]].parent = logs[i]; }',
  '  const lastLog = logs[logs.length - 1];',
  '  BB[lastLog].next = site;',
  '  BB[site].parent = lastLog;',
  '  // 找到直接包含 site 的那个分支输入，把它的头换成 headId',
  '  let par = BB[site].parent;',
  '  if (par === lastLog) par = (function findOwner() { return undefined; })();',
  '  {',
  '    const owner = (() => {',
  '      let c = BB[site].parent;',
  '      // site.parent 已改成 lastLog，真正的分支所有者要从 lastLog.parent 找不到，改用扫描',
  '      for (const id of Object.keys(BB)) {',
  '        const q = BB[id];',
  '        if (!q || !q.inputs) continue;',
  '        for (const v of Object.values(q.inputs)) {',
  '          if (Array.isArray(v) && v[1] === site) return { id, key: null };',
  '        }',
  '      }',
  '      return null;',
  '    })();',
  '    if (owner) {',
  '      const q = BB[owner.id];',
  '      for (const [k, v] of Object.entries(q.inputs)) {',
  '        if (Array.isArray(v) && v[1] === site) q.inputs[k] = [2, headId];',
  '      }',
  '      console.log("[PZ102] branch head replaced in " + owner.id);',
  '    } else {',
  '      console.log("[PZ102] WARN: could not find the branch owner; probe may not run");',
  '    }',
  '  }',
  ''
].join('\n');
s = s.slice(0, start) + repl + s.slice(end);
fs.writeFileSync('_work/v41/pz102.txt', s);
console.log('rewrote pz102 install part');
