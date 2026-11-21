const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(p, 'utf8');
const oldColor = "    webs.sort((a, b) => a.start - b.start);\n    const active = [];\n    if (process.env.V5_OLDCOLOR) {\n      // legacy region rule: two variables may share a slot only when their regions sit in\n      // disjoint subtrees (comparable regions always conflict)\n      const webOf = Object.create(null), chainOf = Object.create(null);\n      for (const w of webs) {\n        let web = null;\n        for (const bid of w.ids) { const r = regionOf[bid]; web = (web === null) ? r : (web === r ? web : lca(web, r)); }\n        webOf[w.v] = web;\n        const chain = new Set();\n        for (let r = web; r !== undefined && r !== null; r = regParent[r]) chain.add(r);\n        chainOf[w.v] = chain;\n      }\n      const order2 = webs.slice().sort((a, b) => chainOf[b.v].size - chainOf[a.v].size);\n      const color2 = Object.create(null);\n      for (const w of order2) {\n        const taken = new Set();\n        for (const u in color2) {\n          if (chainOf[u].has(webOf[w.v]) || chainOf[w.v].has(webOf[u])) taken.add(color2[u]);\n        }\n        let c = 0; while (taken.has(c)) c++;\n        color2[w.v] = c;\n        const nid = procScript[s] ? ('v5q' + poolKeyOf[s] + '_' + c) : ('v5s' + s + '_' + c);\n        if (!newVars[nid]) newVars[nid] = procScript[s] ? ['v5regP' + c, varsDict[w.v][1]] : ['v5reg' + slotCount++, varsDict[w.v][1]];\n        for (const bid of w.ids) assignAt[bid] = nid;\n        pooledCount++;\n      }\n      continue;\n    }";
const a = "    webs.sort((a, b) => a.start - b.start);" + NL + "    const active = [];";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
s = s.slice(0, i) + oldColor + s.slice(i + a.length);
fs.writeFileSync(p, s);
console.log('oldcolor knob added');