$o = node _work/v41/dbgrun.mjs MiniPy_v4.24.sb3 _work/v41/pg50.json 'pc,error,ev,evtype,xbr,xdep,xj,xa,xb,lidx,xlen,count' 'Output,Tok' 2>$null
$o | Set-Content -Encoding utf8 _work/v41/dbg50.txt
'done'