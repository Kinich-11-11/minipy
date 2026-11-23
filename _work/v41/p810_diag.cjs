// P810 diagnostic: preserve list-valued frame entries and expose capture/restore state.
patch('P810 diagnostic list alias cache/restore',()=>{
 const a=n=>argOf(n),v=n=>VAR(n),call=(p,...args)=>callProc(p,args),J=(...xs)=>xs.reduce((x,y)=>JOIN(x,y),txt(''));
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P801LN',[]); B.addList(IT,'P801LV',[]);
 for(const n of ['p810i'])newVar(n,0);
 const cap=newProc('p801capture',[]);
 attachBody(cap.defId,[
  clearL('P801LN'),clearL('P801LV'),setV('p810i',num(1)),
  addTo('Output',J(txt('P810CAP-BEGIN names='),llen('Names'),txt(' types='),llen('Types'))),
  REPEATU(GT(v('p810i'),llen('Names')),[
   IF(EQ(item('Types',v('p810i')),txt('L'),),[
    addTo('P801LN',item('Names',v('p810i'))),addTo('P801LV',item('Values',v('p810i'))),
    addTo('Output',J(txt('P810-L name='),item('Names',v('p810i')),txt(' value='),item('Values',v('p810i'))))
   ]),
   chgV('p810i',num(1))
  ]),
  addTo('Output',J(txt('P810CAP-END cached='),llen('P801LN')))
 ]);
 const rst=newProc('p801restore',[]);
 attachBody(rst.defId,[
  setV('p810i',num(1)),addTo('Output',J(txt('P810RST-BEGIN cached='),llen('P801LN'))),
  REPEATU(GT(v('p810i'),llen('P801LN')),[
   call('lookup %s',item('P801LN',v('p810i'))),
   IF(GT(v('found'),num(0)),[
    repl('Values',v('found'),item('P801LV',v('p810i'))),
    addTo('Output',J(txt('P810-R name='),item('P801LN',v('p810i')),txt(' found='),v('found'),txt(' value='),item('P801LV',v('p810i'))))
   ]),
   chgV('p810i',num(1))
  ]),
  addTo('Output',J(txt('P810RST-END cached='),llen('P801LN')))
 ]);
 const dId=defIdOf('genExceptionMeth783 %s %s %s %s');
 const d=inDef('genExceptionMeth783 %s %s %s %s');
 const rs=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='genResumeException783 %s %s %s');
 if(rs.length!==1)throw Error('[P810] resume='+rs.length);
 spliceAfter(rs[0],call('p801capture'));
 const p801If=BL()[dId].next;
 if(!p801If)throw Error('[P810] missing definition body');
 prependStack(p801If,'SUBSTACK',call('p801restore'));
 console.log('[P810D] installed at '+p801If);
});
