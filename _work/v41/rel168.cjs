const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.167.sb3 (newest)', 'MiniPy_v4.168.sb3 (newest)')
     .replace(/MiniPy_v4\.167\.sb3'/g, "MiniPy_v4.168.sb3'")
     .replace('MiniPy v4.167 - built', 'MiniPy v4.168 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p167 = 'P286'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.168 = +P287 (Tier-1 item 2, part 2: container reprs honour __repr__).  `print([R()])`',
  '#           answered [<R object>].  The container text comes from listfmt/tupfmt/dictfmt/setfmt,',
  '#           which call `reprval` per element; P287 wraps THAT call in each formatter:',
  '#               if evtype == "O" and (InstCls[ev] & ".__repr__") in FnName:',
  '#                   callmeth(ev, "__repr__", 1, 0)      # result lands in ev',
  '#               else:  reprval(ev, evtype)',
  '#           It must NOT stop the script here (that would truncate the container), so the wrap',
  '#           pattern from P281 is used: detach next, insert the wrapper, re-link next onto it.',
  '#           STILL OPEN (last piece of item 2): f-strings -- `f"{Q()}"` still gives "<Q object>";',
  '#           that formatter needs the same treatment at its own element step.)',
  "$p168 = 'P287'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
