// P811: restore the handled throw's list aliases only after methodcall's
// outer dispatch/rebuild loop has finished, avoiding a later frame overwrite.
patch('P811 late list alias restore after methodcall',()=>{
 const a=n=>argOf(n),v=n=>VAR(n),call=(p,...args)=>callProc(p,args);
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P801LN',[]); B.addList(IT,'P801LV',[]);
 for(const n of ['p811i','p811Pending'])newVar(n,0);
 const cap=newProc('p801capture',[]);
 attachBody(cap.defId,[
  clearL('P801LN'),clearL('P801LV'),setV('p811i',num(1)),setV('p811Pending',num(1)),
  REPEATU(GT(v('p811i'),llen('Names')),[
   IF(EQ(item('Types',v('p811i')),txt('L')),[addTo('P801LN',item('Names',v('p811i'))),addTo('P801LV',item('Values',v('p811i')))]),
   chgV('p811i',num(1))
  ])
 ]);
 const rst=newProc('p801restore',[]);
 attachBody(rst.defId,[
  setV('p811i',num(1)),
  REPEATU(GT(v('p811i'),llen('P801LN')),[
   call('lookup %s',item('P801LN',v('p811i'))),
   IF(GT(v('found'),num(0)),[repl('Values',v('found'),item('P801LV',v('p811i')))]),
   chgV('p811i',num(1))
  ])
 ]);
 const d=inDef('genExceptionMeth783 %s %s %s %s');
 const rs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='genResumeException783 %s %s %s');
 if(rs.length!==1)throw Error('[P811] resume='+rs.length);
 spliceAfter(rs[0],call('p801capture'));
 const mId=defIdOf('methodcall %s %s');
 let tail=BL()[mId].next, guard=0;
 while(tail && BL()[tail].next && guard++<1000)tail=BL()[tail].next;
 if(!tail)throw Error('[P811] methodcall body missing');
 spliceAfter(tail,IF(EQ(v('p811Pending'),num(1)),[call('p801restore'),setV('p811Pending',num(0))]));
 console.log('[P811] late restore installed at '+tail);
});
