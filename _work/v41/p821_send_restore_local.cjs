// P821 candidate: preserve a normal generator resume's list aliases across fpop.
patch('P821 restore normal generator aliases after fpop',()=>{
 const v=n=>VAR(n), call=(p,...args)=>callProc(p,args);
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P821LN',[]); B.addList(IT,'P821LV',[]);
 newVar('p821i',0); newVar('p821Pending',0); newVar('p821cur','');
 const cap=newProc('p821capture',[]);
 attachBody(cap.defId,[
  clearL('P821LN'),clearL('P821LV'),setV('p821i',num(1)),setV('p821Pending',num(1)),
  REPEATU(GT(v('p821i'),llen('Names')),[
   IF(EQ(item('Types',v('p821i')),txt('L')),[addTo('P821LN',item('Names',v('p821i'))),addTo('P821LV',item('Values',v('p821i')))]),
   chgV('p821i',num(1))
  ])
 ]);
 const rst=newProc('p821restore',[]);
 attachBody(rst.defId,[
  setV('p821i',num(1)),
  REPEATU(GT(v('p821i'),llen('P821LN')),[
   call('lookup %s',item('P821LN',v('p821i'))),
   IF(GT(v('found'),num(0)),[setV('p821cur',item('Values',v('found'))),repl('Values',v('found'),JOIN(v('p821cur'),item('P821LV',v('p821i'))))]),
   chgV('p821i',num(1))
  ])
 ]);
 const cu=inDef('calluser %s %s %s');
 const fp=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P821] fpop='+fp.length);
 const cond=AND(AND(EQ(item('FnKind',v('fi')),txt('G')),EQ(v('gnew'),num(0))),AND(EQ(v('gyld'),num(1)),EQ(item('GHyfOn',v('gmy')),num(0))));
 insertBeforeStmt(fp[0],[IF(cond,[call('p821capture')])]);
 insertBeforeStmt(fp[0],[IF(EQ(v('p821Pending'),num(1)),[call('p821restore'),setV('p821Pending',num(0))])]);
 console.log('[P821] capture/restore around calluser fpop');
});

