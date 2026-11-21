const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.171.sb3 (newest)', 'MiniPy_v4.172.sb3 (newest)')
     .replace(/MiniPy_v4\.171\.sb3'/g, "MiniPy_v4.172.sb3'")
     .replace('MiniPy v4.171 - built', 'MiniPy v4.172 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p171 = 'P295'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.172 = +P298 (Tier-3 item 9 COMPLETE: iterators have state).  `it = iter([1,2,3])` then',
  '#           three `next(it)` gave 1 1 1 and never raised StopIteration.  Implementation:',
  '#             * `iter(x)` registers a cursor -- ItSrc[id] = the source list, ItPos[id] = 1 --',
  '#               and answers a value of the NEW type tag "Y" whose text is that id;',
  '#             * `next(x)` with evtype "Y" takes ItSrc[id][ItPos[id]], bumps the position, and',
  '#               raises StopIteration past the end;',
  '#             * `callfn`\'s `list` branch maps "Y" -> ItSrc[ev];',
  '#             * `forloop` maps "Y" -> ItSrc[ev] right before its outer',
  '#               `IFELSE(evtype in (L,T,G))` (disassembly lines 148-172) -- inserting it before',
  '#               the inner `fail "for expects a string"` is TOO LATE, which cost two rounds.',
  '#           A previous attempt kept the value a plain list and stored the cursor in `evK`: that',
  '#           is dead on arrival, because `it = iter(...)` (an assignment) CLEARS evK.',
  '#           Verified: _nx 3/6 -> 6/6, _it 6/6, _oo 22/30, _be 26/27 unchanged.)',
  "$p172 = 'P298'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
