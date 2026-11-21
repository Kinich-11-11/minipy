$o = node _work/v41/dbgrun.mjs MiniPy_v4.25.sb3 _work/v41/pg52.json 'pc,error,ev,evtype,dgkey,dgkt,dgn,dgi,dgj,dgeop' 'Output,Names,Values,Types,DOut,Tok' 2>$null
$o | Set-Content -Encoding utf8 _work/v41/dbg52.txt
'done'