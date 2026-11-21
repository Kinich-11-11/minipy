const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
// deterministic ids: the counter is already unique, the random suffix only broke reproducibility
rep("  nid(p) { this.n++; return 'v5' + p + this.n.toString(36) + Math.random().toString(36).slice(2, 5); }",
    "  // Deterministic ids and block placement: same sources in, byte-identical project.json out.\n" +
    "  nid(p) { this.n++; return 'v5' + p + this.n.toString(36); }\n" +
    "  // a cheap deterministic scatter so scripts do not overlap in the editor\n" +
    "  jitter(seed) { return (seed * 2654435761) % 3000; }", 'nid');
rep("      x: 4000 + Math.floor(Math.random() * 3000), y: 4000 + Math.floor(Math.random() * 3000),",
    "      x: 4000 + this.jitter(this.n), y: 4000 + this.jitter(this.n + 977),", 'def pos');
rep("    const id = this.make(t, opcode, { topLevel: true, x: 100 + Math.floor(Math.random() * 3000), y: 100 + Math.floor(Math.random() * 3000) });",
    "    const id = this.make(t, opcode, { topLevel: true, x: 100 + this.jitter(this.n), y: 100 + this.jitter(this.n + 613) });", 'hat pos');
fs.writeFileSync(P, s);