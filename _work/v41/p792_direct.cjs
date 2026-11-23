// P792: place delegated-generator throw interception in genExceptionMeth783 itself.
// The previous P791 hook was installed in generic methodcall, which is not the
// active path for this throw() case.
patch('P792 direct genException yield-from throw',()=>{
  const d=inDef('genExceptionMeth783 %s %s %s %s');
  const hits=find(d,b=>b.opcode==='procedures_call' && b.mutation && b.mutation.proccode==='genResumeException783 %s %s %s' && JSON.stringify(b.inputs||{}).includes('g783x'));
  if(hits.length!==1) throw new Error('P792 expected one outer genResume call, got '+hits.length);
  const a=n=>argOf(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  insertBeforeStmt(hits[0],[
    callProc('yfThrowP791 %s %s %s',[a('g'),a('lo'),a('hi')]),
    IF(EQ(VAR('p791handled'),num(1)),[stop()])
  ]);
  console.log('[P792] direct genException hook installed before outer resume');
});


