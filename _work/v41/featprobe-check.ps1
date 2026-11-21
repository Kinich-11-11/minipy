# run the six feature probe suites against a candidate build and compare the pass count
#   pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 _work/v41/_t39.sb3 -tag v439
param([string]$sb3, [string]$tag = 'new')
$root = 'D:/编程/scratch/ai/minipython'
$out = "$root/_work/v41/featprobe_$tag.txt"
'' | Set-Content -Encoding utf8 $out
for ($i = 1; $i -le 6; $i++) {
  $name = if ($i -eq 1) { 'featprobe' } else { "featprobe$i" }
  $json = "$root/_work/v41/$name.json"
  $res = "$root/_work/v41/${name}_${tag}.json"
  $txt = node "$root/_work/v41/run.mjs" $sb3 $json $res 2>$null
  $sum = ($txt | Select-String -Pattern '^cases=' | Select-Object -First 1).Line
  $base = "$root/_work/v41/${name}_out.json"
  $old = if (Test-Path $base) { (Get-Content $base -Raw | ConvertFrom-Json | Where-Object { $_.same -eq $true }).Count } else { '?' }
  $new = (Get-Content $res -Raw | ConvertFrom-Json | Where-Object { $_.same -eq $true }).Count
  $fails = (($txt | Select-String -Pattern '^FAIL' | ForEach-Object { $_.Line }) -join ' ; ')
  Add-Content -Encoding utf8 $out "$name : $sum  pass(old=$old new=$new)"
  if ($fails) { Add-Content -Encoding utf8 $out "      $fails" }
}
Add-Content -Encoding utf8 $out 'DONE'
Get-Content $out
