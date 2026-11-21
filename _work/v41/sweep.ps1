param([string]$sb3 = 'MiniPy_v4.55.sb3', [string]$tag = 'v455', [string]$ref = 'v454')
$root = 'D:/编程/scratch/ai/minipython'
$out = "$root/_work/v41/sweep_$tag.txt"
'' | Set-Content -Encoding utf8 $out
$files = @()
$files += Get-ChildItem "$root/_work/cmp47" -Filter "*_$ref.json" | ForEach-Object { $_.FullName }
$files += Get-ChildItem "$root/_work/v41" -Filter "*_$ref.json" | ForEach-Object { $_.FullName }
foreach ($f in ($files | Sort-Object)) {
  $base = $f -replace "_$ref\.json$", ''
  $cases = "$base.json"
  if (-not (Test-Path $cases)) { Add-Content -Encoding utf8 $out "SKIP (no cases) $(Split-Path $cases -Leaf)"; continue }
  $newOut = "$base`_$tag.json"
  $txt = node "$root/_work/v41/run.mjs" "$root/$sb3" $cases $newOut 2>$null
  $sum = ($txt | Select-String -Pattern '^cases=' | Select-Object -First 1).Line
  $fails = (($txt | Select-String -Pattern '^FAIL' | ForEach-Object { $_.Line }) -join ' ; ')
  $name = Split-Path $cases -Leaf
  Add-Content -Encoding utf8 $out "$name : $sum"
  if ($fails) { Add-Content -Encoding utf8 $out "      $fails" }
}
Add-Content -Encoding utf8 $out 'DONE'
Get-Content $out | Select-Object -Last 4
