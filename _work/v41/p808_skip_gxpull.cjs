// P808: after a handled delegated throw has yielded a value, the legacy
// StopIteration cleanup branch must not gxpull the outer frame snapshot;
// that would overwrite shared-list mutations made in the child handler.
patch('P808 skip gxpull after cached delegated throw',()=>{
 const d=inDef('genResumeException783 %s %s %s');
 const gs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='gxpull %s');
 if(gs.length!==1)throw Error('[P808] gxpull='+gs.length);
 const gate=IF(EQ(VAR('p801Valid'),num(0)),[gs[0]]);
 replaceStmt(gs[0],gate);
 console.log('[P808] gxpull gated by p801Valid');
});

