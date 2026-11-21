$out='D:/编程/scratch/ai/minipython/_work/v41/res_v424.txt'
'' | Set-Content -Encoding utf8 $out
foreach ($s in 'm50','gaps','cont','nested2','comp','one2','nested') {
  Add-Content -Encoding utf8 $out "== $s"
  $t = node _work/v41/run.mjs MiniPy_v4.24.sb3 "_work/v41/$s.json" --verbose 2>$null
  Add-Content -Encoding utf8 $out (($t | Select-String -Pattern '^(cases=|by tag=|FAIL )' | ForEach-Object { $_.Line }) -join "`n")
}