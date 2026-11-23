patch('P806 trace after generator frame restore',()=>{
 const d=inDef('genResumeException783 %s %s %s'); const cs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='egRestore764'); if(!cs.length)throw Error('P806 egrestore='+cs.length); for(const c of cs)spliceAfter(c,callProc('p802dump %s',[txt('after-egrestore')])); console.log('[P806] installed');
});

