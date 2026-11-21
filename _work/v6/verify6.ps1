# MiniPy v6 - one-command verification.
#   pwsh -File _work/v6/verify6.ps1                     # verify the shipped MiniPy_v6.sb3
#   pwsh -File _work/v6/verify6.ps1 -Sb3 <path>         # verify another artifact
#   pwsh -File _work/v6/verify6.ps1 -Build              # rebuild first, then verify
# The comprehension-scope suite (ctest.json) is part of the default run: it used to record
# four known deviations from CPython and v6 passes all of them.
param([string]$Sb3 = 'MiniPy_v6.sb3', [switch]$Build, [switch]$TurboWarp)
# -TurboWarp runs the same battery against TurboWarp's scratch-vm checkout instead of the
# official scratch-vm: the two engines do NOT agree on every primitive (see section 11 of
# MiniPy_v6_修复说明.md), so both must be green.
if ($TurboWarp) {
  $env:NODE_PATH = 'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules'
  $env:MINIPY_VM = 'D:/编程/scratch/ai/minipython/scratch-vm-develop/scratch-vm-develop/src/index.js'
  $env:MINIPY_NOCOMPILE = '1'
}
$ErrorActionPreference = 'Continue'
if ($Build) { $env:V5_OUT = $Sb3; node _work/v5/build5.js | Select-String 'Interpreter|total blocks' }
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
  @('gtest.json', 'gtruth.json'),
  @('ntest.json', 'ntruth.json'),
  @('stest2.json', 'struth2.json'),
  @('wtest.json', 'wtruth.json'),
  @('ptest.json', 'ptruth.json'),
  @('ktest.json', 'ktruth.json'),
  @('btest.json', 'bptruth.json'),
  @('edge.json', 'edgetruth.json'),
  @('p0.json', 'p0truth.json'),
  @('p1.json', 'p1truth.json'),
  @('p2.json', 'p2truth.json'),
  @('p3.json', 'p3truth.json')
)
# comprehension-scope suite: it used to record four known deviations, v6 passes it
$suites += ,@('ctest.json', 'ctruth.json')
$total = 0; $failed = 0; $suiteFails = 0
foreach ($s in $suites) {
  $dir = if (@('p0.json', 'p1.json', 'p2.json', 'p3.json') -contains $s[0]) { '_work/' } else { '_work/v5/' }
  $out = node _work/v5/run5.cjs $Sb3 ($dir + $s[0]) --truth ($dir + $s[1]) --max 8000 2>$null
  $line = ($out | Select-String 'PASS \d+').Line
  if ($line -match 'PASS (\d+)\s+FAIL (\d+)') {
    $p = [int]$Matches[1]; $f = [int]$Matches[2]
    $total += $p + $f; $failed += $f
    if ($f -gt 0) { $suiteFails++; Write-Host ($s[0].PadRight(14) + ' ' + $line) -ForegroundColor Red; ($out | Select-String '^  x ') | ForEach-Object { Write-Host ('    ' + $_.Line) } }
    else { Write-Host ($s[0].PadRight(14) + ' ' + $line) }
  } else { Write-Host ($s[0].PadRight(14) + ' NO RESULT') -ForegroundColor Yellow; $suiteFails++ }
}
node _work/v6/linecheck.cjs $Sb3
if ($LASTEXITCODE -ne 0) { $suiteFails++ }
Write-Host ''
Write-Host ('suites=' + $suites.Count + '  cases=' + $total + '  failures=' + $failed)
if ($failed -gt 0 -or $suiteFails -gt 0) { exit 1 } else { Write-Host 'ALL GREEN' }