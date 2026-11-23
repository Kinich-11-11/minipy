// P793: gate the original outer resume instead of relying on stop-this-script
// inside a called custom block (which returns to the caller in this VM).
patch('P793 gate outer resume after delegated throw',()=>{
  const d=inDef('genExceptionMeth783 %s %s %s %s');
  const hits=find(d,b=>b.opcode==='procedures_call' && b.mutation && b.mutation.proccode==='genResumeException783 %s %s %s' && JSON.stringify(b.inputs||{}).includes('g783x'));
  if(hits.length!==1) throw new Error('P793 expected one outer genResume call, got '+hits.length);
  const a=n=>argOf(n);
  const gate=IF(EQ(VAR('p791handled'),num(0)),[hits[0]]);
  replaceStmt(hits[0],gate);
  insertBeforeStmt(gate,[callProc('yfThrowP791 %s %s %s',[a('g'),a('lo'),a('hi')])]);
  console.log('[P793] outer resume gated by p791handled');
});
