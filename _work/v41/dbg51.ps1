$o = node _work/v41/dbgrun.mjs MiniPy_v4.25.sb3 _work/v41/pg51.json 'pc,error,ev,evtype,xa,xb,dgi,dgn,dgkey,dgkt,found,ln,lidx' 'Output,Tok,DOut' 2>$null
$o | Set-Content -Encoding utf8 _work/v41/dbg51.txt
'done'