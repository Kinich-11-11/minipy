$root = 'D:/编程/scratch/ai/minipython'
# Reuse the real skip table from rebuild-old.ps1 (so this check cannot drift from it).
$txt = Get-Content "$root/_work/v41/rebuild-old.ps1" -Raw
$start = ([regex]::Match($txt, '(?m)^\$p\d+ = ')).Index
$mapAt = $txt.IndexOf('$map = [ordered]@{')
$end = $txt.IndexOf("`n}", $mapAt) + 2
if ($start -lt 0 -or $mapAt -lt 0 -or $end -lt 0) { throw 'could not slice the skip table' }
Invoke-Expression $txt.Substring($start, $end - $start)
New-Item -ItemType Directory -Force -Path "$root/_work/v41/rebuild" | Out-Null
foreach ($k in @('v4.179', 'v4.178', 'v4.177', 'v4.176', 'v4.175', 'v4.173', 'v4.172', 'v4.170', 'v4.169', 'v4.168', 'v4.166', 'v4.165', 'v4.164', 'v4.163', 'v4.162', 'v4.161', 'v4.160', 'v4.159', 'v4.158', 'v4.157', 'v4.156', 'v4.155', 'v4.154', 'v4.153', 'v4.152', 'v4.151', 'v4.150', 'v4.149', 'v4.148', 'v4.147', 'v4.146', 'v4.145', 'v4.144', 'v4.143', 'v4.142', 'v4.141', 'v4.140', 'v4.139', 'v4.138', 'v4.137', 'v4.136', 'v4.135', 'v4.134', 'v4.133', 'v4.132', 'v4.131', 'v4.100', 'v4.10')) {
  $env:V41_SKIP = $map[$k]
  $env:V41_OUT = "$root/_work/v41/rebuild/MiniPy_$k.sb3"
  $env:V41_JSON = "$root/_work/v41/rebuild/project_$k.json"
  $env:V41_STAMP = "MiniPy $k"
  node _work/v41/build41.js *> "$root/_work/v41/rebuild/log_$k.txt"
  $c = node _work/v41/compare.cjs "$root/MiniPy_$k.sb3" "$root/_work/v41/rebuild/MiniPy_$k.sb3"
  Write-Output "$k :: $c"
}
