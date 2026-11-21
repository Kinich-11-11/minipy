param([string]$sb3 = 'MiniPy_v4.24.sb3', [string]$out = 'D:/编程/scratch/ai/minipython/_work/v41/battery_v424.txt')
$suites = 'cls','alias','gen','try','nested2','nested','tuple','comp','gaps','regress','one','one2','b2','cont','func','str','fstr','pct','math','bit','booljson','float','dict'
'' | Set-Content -Encoding utf8 $out
foreach ($s in $suites) {
  $txt = node _work/v41/run.mjs $sb3 "_work/v41/$s.json" 2>$null
  $sum = ($txt | Select-String -Pattern '^cases=' | Select-Object -First 1).Line
  $fails = (($txt | Select-String -Pattern '^FAIL' | ForEach-Object { $_.Line }) -join ' ; ')
  Add-Content -Encoding utf8 $out "$s : $sum"
  if ($fails) { Add-Content -Encoding utf8 $out "      $fails" }
}
Add-Content -Encoding utf8 $out 'DONE'