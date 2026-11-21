const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(p, 'utf8');
const oldBlock = "      const vwebs = [];\n      let cur = null, ok = true;\n      for (const [i, kind, bid] of ss) {\n        if (kind === 'w') { cur = { v: v, start: i, end: i, ids: [bid] }; vwebs.push(cur); }\n        else if (cur) { cur.end = i; cur.ids.push(bid); }\n        else { ok = false; break; }\n      }\n      if (ok) { for (const w of vwebs) webs.push(w); } else { pinnedHere.push(v); }";
const newBlock = "      // Splitting at a def is only valid inside one region.  Across a branch or a loop\n      // body the same register must serve every def that can reach a later use (an\n      // if/else pair both feed the code after the If; a loop body feeds the next\n      // iteration's condition), so those variables collapse into a single web.\n      const regs = new Set();\n      for (const site of ss) regs.add(regionOf[site[2]]);\n      const vwebs = [];\n      if (regs.size === 1) {\n        let cur = null;\n        for (const [i, kind, bid] of ss) {\n          if (kind === 'w') { cur = { v: v, start: i, end: i, ids: [bid] }; vwebs.push(cur); }\n          else { cur.end = i; cur.ids.push(bid); }\n        }\n      } else {\n        const w = { v: v, start: ss[0][0], end: ss[ss.length - 1][0], ids: [] };\n        for (const site of ss) w.ids.push(site[2]);\n        vwebs.push(w);\n      }\n      for (const w of vwebs) webs.push(w);";
const i = s.indexOf(oldBlock);
if (i < 0) { console.log('MISS'); process.exit(1); }
s = s.slice(0, i) + newBlock + s.slice(i + oldBlock.length);
fs.writeFileSync(p, s);
console.log('region-confined splitting installed');