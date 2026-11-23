// P810: preserve list-valued frame entries across the outer method-call pop.
// P801 caches the handled generator.throw result; this companion caches the
// current list bindings at the handled-yield point and reapplies them when the
// duplicate dispatch hits the P801 fast path.
patch('P810 cache shared list aliases for handled throw',()=>{
 const a=n=>argOf(n),v=n=>VAR(n),call=(p,...args)=>callProc(p,args);
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P801LN',[]); B.addList(IT,'P801LV',[]);
 for(const n of ['p810i'])newVar(n,0);
 const cap=newProc('p801capture',[]);
 attachBody(cap.defId,[
  clearL('P801LN'),clearL('P801LV'),setV('p810i',num(1)),
  REPEATU(GT(v('p810i'),llen('Names')),[
   IF(EQ(item('Types',v('p810i')),txt('L')),[addTo('P801LN',item('Names',v('p810i'))),addTo('P801LV',item('Values',v('p810i')))]),
   chgV('p810i',num(1))
  ])
 ]);
 const rst=newProc('p801restore',[]);
 attachBody(rst.defId,[
  setV('p810i',num(1)),
  REPEATU(GT(v('p810i'),llen('P801LN')),[
   call('lookup %s',item('P801LN',v('p810i'))),
   IF(GT(v('found'),num(0)),[repl('Values',v('found'),item('P801LV',v('p810i')))]),
   chgV('p810i',num(1))
  ])
 ]);
 const dId=defIdOf('genExceptionMeth783 %s %s %s %s');
 const d=inDef('genExceptionMeth783 %s %s %s %s');
 const rs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='genResumeException783 %s %s %s');
 if(rs.length!==1)throw Error('[P810] resume='+rs.length);
 spliceAfter(rs[0],call('p801capture'));
 // P801 inserts its fast-path IF before the definition's first statement.
 // Locate that statement by its stable definition entry rather than by
 // serialized variable IDs, which do not contain the source name p801Valid.
 const p801If=BL()[dId].next;
 if(!p801If)throw Error('[P810] missing definition body');
 prependStack(p801If,'SUBSTACK',call('p801restore'));
 console.log('[P810] list alias cache/restore installed at '+p801If);
});


