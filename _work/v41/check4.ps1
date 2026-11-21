$out='D:/编程/scratch/ai/minipython/_work/v41/res_v425b.txt'
'' | Set-Content -Encoding utf8 $out
foreach ($s in 'm52','dict','nested2','nested','tuple','comp','gaps','regress','one','one2','cont','str','b2','float','bit','pct','fstr','func','booljson') {
  Add-Content -Encoding utf8 $out "== $s"
  $t = node _work/v41/run.mjs MiniPy_v4.25.sb3 "_work/v41/$s.json" --verbose 2>$null
  Add-Content -Encoding utf8 $out (($t | Select-String -Pattern '^(cases=|by tag=|FAIL )' | ForEach-Object { $_.Line }) -join "`n")
}
Add-Content -Encoding utf8 $out 'DONE'