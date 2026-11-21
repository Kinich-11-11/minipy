const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.161.sb3 (newest)', 'MiniPy_v4.162.sb3 (newest)')
     .replace(/MiniPy_v4\.161\.sb3'/g, "MiniPy_v4.162.sb3'")
     .replace('MiniPy v4.161 - built', 'MiniPy v4.162 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p161 = 'P276'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.162 = +P280 (builtin iter() / next()).  Both were missing entirely',
  '#           (`next(iter([1,2]))` -> "NameError: name \'iter\' is not defined").  MiniPy evaluates',
  '#           eagerly and has no cursor, so this is the common-usage subset:',
  '#             * iter(x): dict -> its keys (`dictkeys s`), str -> its characters (`charsplit`,',
  '#               which takes NO argument and works on ev), L/T/E/G unchanged;',
  '#             * next(x): answers the first element (`nxv` keeps the container, `listlen` then',
  '#               `listitem`), empty -> StopIteration (registered in P271).',
  '#           Both branches are inserted in `callfn` just before the `fn == "sum"` branch.',
  '#           KNOWN: there is no iterator state, so two consecutive `next` calls both answer the',
  '#           first element, and `iter(<non-iterable>)` answers the value instead of raising a',
  '#           TypeError (a bigger version with the type checks tripped p68\'s block copier, so the',
  '#           minimal form was kept).)',
  "$p162 = 'P280'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
