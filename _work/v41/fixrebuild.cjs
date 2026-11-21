// fixrebuild.cjs : rebuild-old.ps1 was flattened into one line by a bad Set-Content.
// The content is intact, so re-insert the line breaks at the reliable markers:
//   $root = '...'                -> own line
//   $name = '...' / "..."        -> own line (comments between them become comment lines)
//   'vX.Y' = "..."               -> map entry, own line
// the driver at the end is rewritten from scratch (verify-rebuild.ps1 does the checking).
const fs = require('fs');
const P = 'D:/编程/scratch/ai/minipython/_work/v41/rebuild-old.ps1';
const s = fs.readFileSync(P, 'utf8');
const lines = [];
const pushCommentRun = (chunk) => {
  if (!chunk) return;
  for (const piece of chunk.split(/(?=#)/)) {
    const t = piece.replace(/\s+$/, '');
    if (t.trim().length) lines.push(t);
  }
};
const varRe = /\$[A-Za-z_][A-Za-z0-9_]* = '(?:[^']*)'|\$[A-Za-z_][A-Za-z0-9_]* = "(?:[^"]*)"/g;

// (1) header: $root = '...'
let i = s.indexOf('\n');
const firstHash = s.indexOf('#');
lines.push(s.slice(0, firstHash).replace(/\s+$/, ''));
let pos = firstHash;

// (2) everything up to the map: comments interleaved with variable definitions
const mapAt = s.indexOf('$map = [ordered]@{');
const region = s.slice(pos, mapAt);
varRe.lastIndex = 0;
let m, last = 0;
while ((m = varRe.exec(region))) {
  pushCommentRun(region.slice(last, m.index));
  lines.push(m[0]);
  last = m.index + m[0].length;
}
pushCommentRun(region.slice(last));

// (3) the map itself
lines.push('$map = [ordered]@{');
const mapEnd = s.indexOf('\n}', mapAt) >= 0 ? s.indexOf('\n}', mapAt) : s.indexOf('}', mapAt);
const body = s.slice(s.indexOf('{', mapAt) + 1, mapEnd);
const entryRe = /'[^']+' = "[^"]*"/g;
let n = 0;
while ((m = entryRe.exec(body))) { lines.push('  ' + m[0]); n++; }
lines.push('}');
lines.push('');

// (4) a fresh driver (same behaviour as before: rebuild every listed version and compare)
lines.push('New-Item -ItemType Directory -Force -Path "$root/_work/v41/rebuild" | Out-Null');
lines.push('foreach ($k in $map.Keys) {');
lines.push('  $env:V41_SKIP = $map[$k]');
lines.push('  $env:V41_OUT = "$root/_work/v41/rebuild/MiniPy_$k.sb3"');
lines.push('  $env:V41_JSON = "$root/_work/v41/rebuild/project_$k.json"');
lines.push('  $env:V41_STAMP = "MiniPy $k"');
lines.push('  node _work/v41/build41.js *> "$root/_work/v41/rebuild/log_$k.txt"');
lines.push('  $c = node _work/v41/compare.cjs "$root/MiniPy_$k.sb3" "$root/_work/v41/rebuild/MiniPy_$k.sb3"');
lines.push('  Write-Output "$k :: $c"');
lines.push('}');
fs.writeFileSync(P, lines.join('\n') + '\n');
console.log('wrote ' + lines.length + ' lines, ' + n + ' map entries');
