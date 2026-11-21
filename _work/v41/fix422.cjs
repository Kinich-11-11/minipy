const fs = require('fs');
let s = fs.readFileSync('_work/v41/p422.txt', 'utf8');
const from = `  const stmts = [];
  let c = BB[defId].next;
  while (c) { stmts.push(c); c = BB[c].next; }`;
const to = `  const stmts = [];
  const collect = (id) => {
    let c = id;
    while (c) {
      const q = BB[c];
      if (!q) break;
      stmts.push(c);
      for (const [k, v] of Object.entries(q.inputs || {})) {
        if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') { const first = v[1]; collect(first); first; }
      }
      c = q.next;
    }
  };
  collect(BB[defId].next);`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p422.txt', s.replace(from, to));
console.log('recursive collection installed');