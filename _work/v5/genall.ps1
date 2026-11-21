# Regenerate every CPython truth file from the recovered case suites.
$py = 'C:\Users\69241\AppData\Local\Programs\Python\Python314\python.exe'
node _work/v5/mk73.cjs
$pairs = @(
 @('vtest','vtruth'), @('cases73','truth73'), @('xtest','xtruth'), @('ytest','ytruth'),
 @('zsuite','ztruth'), @('jst','jstruth'), @('ft','ftruth'), @('lctest','lctruth'),
 @('dctest','dctruth'), @('bigtest','bigtruth'), @('ttest','ttruth'), @('stest','struth'),
 @('rtest','rtruth'), @('etest','etruth'), @('utest','utruth'), @('nc','nctruth'),
 @('btest','btruth'), @('wtest','wtruth'), @('ptest','ptruth')
)
foreach ($p in $pairs) {
  if (Test-Path "_work\v5\$($p[0]).json") {
    & $py _work\v5\truthgen.py "_work\v5\$($p[0]).json" "_work\v5\$($p[1]).json"
  } else { Write-Host "skip $($p[0]) (no case file)" }
}
foreach ($g in 'gtruthgen.py','ngen.py','sgen.py','kgen.py','cgen.py','edgegen2.py') {
  if (Test-Path "_work\v5\$g") { & $py "_work\v5\$g" }
}
Write-Host 'truth files regenerated'
