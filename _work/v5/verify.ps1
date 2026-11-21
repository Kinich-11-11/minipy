# MiniPy v5 - one-command verification.
#   pwsh -File _work/v5/verify.ps1                 # verify the shipped MiniPy_v5.sb3
#   pwsh -File _work/v5/verify.ps1 -Build          # rebuild first, then verify
#   -IncludeKnown also runs the comprehension-scope suite, which records the four known
#   deviations from CPython (loop variable leaking out of a comprehension).
param([string]$Sb3 = 'MiniPy_v5.sb3', [switch]$Build, [switch]$IncludeKnown)
$ErrorActionPreference = 'Continue'
if ($Build) { node _work/v5/build5.js | Select-String 'Interpreter|total blocks' }
node _work/v5/check.js $Sb3
$suites = @(
  @('vtest.json', 'vtruth.json'),
  @('cases73.json', 'truth73.json'),
  @('xtest.json', 'xtruth.json'),
  @('ytest.json', 'ytruth.json'),
  @('zsuite.json', 'ztruth.json'),
  @('jst.json', 'jstruth.json'),
  @('ft.json', 'ftruth.json'),
  @('lctest.json', 'lctruth.json'),
  @('dctest.json', 'dctruth.json'),
  @('bigtest.json', 'bigtruth.json'),
  @('ttest.json', 'ttruth.json'),
  @('stest.json', 'struth.json'),
  @('rtest.json', 'rtruth.json'),
  @('etest.json', 'etruth.json'),
  @('utest.json', 'utruth.json'),
  @('nc.json', 'nctruth.json'),
  @('btest.json', 'btruth.json'),
  @('gtest.json', 'gtruth.json'),
  @('ntest.json', 'ntruth.json'),
  @('stest2.json', 'struth2.json'),
  @('wtest.json', 'wtruth.json'),
  @('ptest.json', 'ptruth.json'),
  @('ktest.json', 'ktruth.json'),
  @('btest.json', 'bptruth.json'),
  @('edge.json', 'edgetruth.json')
)
if ($IncludeKnown) { $suites += ,@('ctest.json', 'ctruth.json') }
$total = 0; $failed = 0; $suiteFails = 0
foreach ($s in $suites) {
  $out = node _work/v5/run5.cjs $Sb3 ('_work/v5/' + $s[0]) --truth ('_work/v5/' + $s[1]) --max 8000 2>$null
  $line = ($out | Select-String 'PASS \d+').Line
  if ($line -match 'PASS (\d+)\s+FAIL (\d+)') {
    $p = [int]$Matches[1]; $f = [int]$Matches[2]
    $total += $p + $f; $failed += $f
    if ($f -gt 0) { $suiteFails++; Write-Host ($s[0].PadRight(14) + ' ' + $line) -ForegroundColor Red; ($out | Select-String '^  x ') | ForEach-Object { Write-Host ('    ' + $_.Line) } }
    else { Write-Host ($s[0].PadRight(14) + ' ' + $line) }
  } else { Write-Host ($s[0].PadRight(14) + ' NO RESULT') -ForegroundColor Yellow; $suiteFails++ }
}
Write-Host ''
Write-Host ('suites=' + $suites.Count + '  cases=' + $total + '  failures=' + $failed)
if ($failed -gt 0 -or $suiteFails -gt 0) { exit 1 } else { Write-Host 'ALL GREEN' }