const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.159.sb3 (newest)', 'MiniPy_v4.160.sb3 (newest)')
     .replace(/MiniPy_v4\.159\.sb3'/g, "MiniPy_v4.160.sb3'")
     .replace('MiniPy v4.159 - built', 'MiniPy v4.160 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p159 = 'P270'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.160 = +P271 (missing builtin exception classes).  `ExcNames` only had 13 names, so',
  '#           `raise UnboundLocalError(...)` / `except ImportError` / `except OSError` etc. all died',
  '#           with "NameError: name \'X\' is not defined".  The patch appends 15 common CPython',
  '#           exception names (UnboundLocalError, ImportError, ModuleNotFoundError, IndentationError,',
  '#           TabError, LookupError, EOFError, MemoryError, NotImplementedError, FileNotFoundError,',
  '#           OSError, UnicodeError, RecursionError, StopAsyncIteration, FloatingPointError) to both',
  '#           `ExcNames` and `ClsName`, skipping any that are already there (ClsName was empty, so',
  '#           30 entries were added in total).  `raise/except UnboundLocalError` now works.)',
  "$p160 = 'P271'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
