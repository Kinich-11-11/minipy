patch('P807 trace after genResume return',()=>{
 const d=inDef('genExceptionMeth783 %s %s %s %s'); const cs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='genResumeException783 %s %s %s'); if(cs.length!==1)throw Error('P807 rs='+cs.length); spliceAfter(cs[0],callProc('p802dump %s',[txt('after-genresume')])); console.log('[P807] installed');
});
