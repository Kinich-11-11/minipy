#!/bin/bash
cd "C:/Personal/个人/编程/scratch/ai/minipython"
S=MiniPy_v4.235.sb3
L=_work/v41/_reg235.log
: > $L
run() { echo "== $*" >> $L; node _work/v41/run_iso.mjs $S "$@" >> $L 2>/dev/null | tail -1 >> $L; }
run _work/v41/_reg232.json _work/v41/_reg232_235.json r232
run _work/v41/_exc232.json _work/v41/_exc232_235.json e232
run _work/v41/_exc232_edges.json _work/v41/_edges_235.json edg
run _work/v41/_probe232.json _work/v41/_probe232_235.json prb
run _work/v41/_exc232_validation.json _work/v41/_excval_235.json ev
run _work/v41/_v233_exchain.json _work/v41/_v233e_235.json ve
run _work/v41/_v233_conv.json _work/v41/_v233c_235.json vc
run _work/v41/_v233_round_type.json _work/v41/_v233r_235.json vr
run _work/v41/_v233_dt_match.json _work/v41/_v233d_235.json vd
run _work/v41/_v233_genexp.json _work/v41/_v233g_235.json vg
run _work/v41/_raw3.json _work/v41/_raw3_235.json raw
run _work/v41/_gap131_233.json _work/v41/_gap131_235.json gap
for f in _work/v41/_mods20_232_*.json; do run $f _work/v41/$(basename $f .json)_235.json mods; done
run _work/v41/_real_math.json _work/v41/_rm_235.json rm
run _work/v41/_real_cmath.json _work/v41/_rcm_235.json rcm
run _work/v41/_real_datetime.json _work/v41/_rdt_235.json rdt
run _work/v41/_real_random.json _work/v41/_rrnd_235.json rr
run _work/v41/_real_re.json _work/v41/_rre_235.json rre
run _work/v41/_real_time.json _work/v41/_rtm_235.json rtm
run _work/v41/_real2_container.json _work/v41/_r2c_235.json r2c
run _work/v41/_real2_cross.json _work/v41/_r2x_235.json r2x
run _work/v41/_real2_func.json _work/v41/_r2f_235.json r2f
run _work/v41/_real3_hof.json _work/v41/_r3h_235.json r3h
run _work/v41/_real3_pipe.json _work/v41/_r3p_235.json r3p
run _work/v41/_real3_exc.json _work/v41/_r3e_235.json r3e
run _work/v41/_real3_cpx.json _work/v41/_r3c_235.json r3c
echo "== main-runall" >> $L
node _work/v41/runall.mjs $S _work/v41/_res235all _work/v41/_new*.txt _work/v41/_cov*.txt >> $L 2>/dev/null | tail -2 >> $L
echo "== demo" >> $L
node _work/v41/_demo_e2e3.mjs $S >> $L 2>/dev/null | tail -3 >> $L
echo "== check41" >> $L
node _work/v41/check41.cjs $S >> $L 2>/dev/null | tail -3 >> $L
echo DONE >> $L
