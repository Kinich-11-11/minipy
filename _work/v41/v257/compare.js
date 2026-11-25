const eq831=(x,t)=>EQ(x,s(t)), plus831=(x,k)=>ADD(x,n(k));
patch('MP-92: rich comparison dispatch on evaluated values',()=>{
  const obj=t=>eq831(a(t),'O'), cls=x=>item('InstCls',a(x));
  const same=()=>AND(EQ(a('lt'),a('rt')),EQ(a('l'),a('r'))); // Encoded instance IDs are identity keys.
  const done=()=>IF(OR(NOT(ok()),NOT(type('?'))),[stop()]);
  const args=(...names)=>names.map(a);
  proc('richSlot831',['l','lt','slot','r','rt'],[
    IF(obj('lt'),[
      c('nameHas776FnName',JOIN(cls('l'),JOIN(s('.'),a('slot')))),
      IF(hasMethod(),[c('egCallback764',a('l'),a('slot'),a('r'),a('rt')),stop()]),
      // object.__ne__ delegates to this operand's __eq__ only in the absence of __ne__.
      IF(eq831(a('slot'),'__ne__'),[c('trySlot830',a('l'),a('lt'),s('__eq__'),a('r'),a('rt')),
        IF(NOT(ok()),[stop()]),IF(NOT(type('?')),[c('truth',v('ev'),v('evtype')),IF(ok(),result(EQ(v('truthv'),n(0)),'B')),stop()])])]),
    ...result(s('NotImplemented'),'?')]);
  const attempt=(other)=>[c('richSlot831',...args(...(other?['r','rt','reverse','l','lt']:['l','lt','forward','r','rt']))),done()];
  const csv=x=>JOIN(s(','),JOIN(x,s(',')));
  proc('richFallback831',['l','lt','r','rt','op'],fallback());
  proc('rich831',['l','lt','r','rt','op','forward','reverse'],[
    // Proper right subclass has priority, even if it inherits the same comparison slot.
    IF(AND(obj('lt'),obj('rt')),[c('nameEq776',cls('l'),cls('r')),IF(is('cs776ok','0'),[
      sv('cname',cls('r')),c('clsmro'),c('sfind',csv(v('ev')),csv(cls('l'))),IF(NOT(LT(v('ev'),n(0))),[
        ...attempt(true),...attempt(false),c('richFallback831',...args('l','lt','r','rt','op')),stop()])])]),
    ...attempt(false),...attempt(true),c('richFallback831',...args('l','lt','r','rt','op'))]);
  // Remove the two legacy token-based shortcuts, including the equality tail on RHS error.
  const def=defIdOf('rightside %s %s %s %s %s');
  if(BL()[def].next!=='bcontro_ns48p1qin'||BL()['bcontro_nrotujs6g'].next)throw Error('Unexpected comparison layout');
  BL()[def].next=BL()['bcontro_ns48p1qin'].next; BL()[predecessorOf('bcontro_nrotujs6g')].next=null;
  const slots=[['==','eq','eq'],['!=','ne','ne'],['<','lt','gt'],['>','gt','lt'],['<=','le','ge'],['>=','ge','le']];
  prependStack('bcontro_kcl0gjlw','SUBSTACK',chain(slots.map(([op,f,r])=>IF(eq831(a('op'),op),[
    c('rich831',a('leftval'),a('lefttype'),v('ev'),v('evtype'),a('op'),s('__'+f+'__'),s('__'+r+'__')),stop()]))));
  function fallback(){return [IF(eq831(a('op'),'=='),[...result(same(),'B'),stop()]),
    IF(eq831(a('op'),'!='),[...result(NOT(same()),'B'),stop()]),
    sv('p6v',a('l')),sv('p6t',a('lt')),c('tname'),sv('nmL',v('p6msg')),
    sv('p6v',a('r')),sv('p6t',a('rt')),c('tname'),
    c('fail',[s("TypeError: '"),a('op'),s("' not supported between instances of '"),v('nmL'),s("' and '"),v('p6msg'),s("'")].reduce((x,y)=>JOIN(x,y)))];}
});
