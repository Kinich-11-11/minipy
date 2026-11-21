param([string]$tag = 'v455', [string]$ref = 'v454')
$root = 'D:/编程/scratch/ai/minipython'
$out = "$root/_work/v41/sweepcmp_$tag.txt"
'' | Set-Content -Encoding utf8 $out
$newFiles = @()
$newFiles += Get-ChildItem "$root/_work/cmp47" -Filter "*_$tag.json" | ForEach-Object { $_.FullName }
$newFiles += Get-ChildItem "$root/_work/v41" -Filter "*_$tag.json" | ForEach-Object { $_.FullName }
$ok = 0; $bad = 0
foreach ($n in ($newFiles | Sort-Object)) {
  $r = $n -replace "_$tag\.json$", "_$ref.json"
  $name = Split-Path $n -Leaf
  if (-not (Test-Path $r)) { Add-Content -Encoding utf8 $out "NOREF $name"; continue }
  $txt = node "$root/_work/v41/cmpout2.cjs" $r $n 2>&1
  $sum = ($txt | Select-String -Pattern '^TOTAL' | Select-Object -First 1).Line
  $detail = ($txt | Select-String -Pattern '^(DIFF|ADDED|REMOVED)' | ForEach-Object { $_.Line }) -join ' | '
  if ($sum -match 'diff=0 added=0 removed=0') { $ok++; Add-Content -Encoding utf8 $out "SAME $name : $sum" }
  else {
    $bad++; Add-Content -Encoding utf8 $out "DIFF $name : $sum"
    Add-Content -Encoding utf8 $out "     $detail"
    $txt | Select-String -Pattern '^   ' | ForEach-Object { Add-Content -Encoding utf8 $out ("     " + $_.Line) }
  }
}
Add-Content -Encoding utf8 $out "TOTAL same=$ok diff=$bad"
Add-Content -Encoding utf8 $out 'DONE'
Get-Content $out | Select-Object -Last 3
