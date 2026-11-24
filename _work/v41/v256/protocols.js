// Dispatch on captured operands, not on the original RHS tokens a second time.
patch('Instance operators and attribute protocol',()=>{
  before('Ne?Rlwf{=459y.Tf;U?_',IF(eq830(v('ev'),'NotImplemented'),[c('nameEq776',v('ev'),s('NotImplemented')),IF(is('cs776ok','1'),[...result(s('NotImplemented'),'?'),stop()])]));
  for(const fn of ['strval','reprval']) enter(fn+' %s %s',IF(eq830(a('vt'),'?'),[...result(s('NotImplemented'),'S'),stop()]));
  enter('tname',IF(is('p6t','?'),[sv('p6msg',s('NotImplementedType')),stop()]));
  enter('truth %s %s',IF(eq830(a('vt'),'?'),[sv('truthv',n(1)),stop()]));
  const kinds={'+':'add','-':'sub','*':'mul','/':'truediv','//':'floordiv','%':'mod','**':'pow','&':'and','|':'or','^':'xor','<<':'lshift','>>':'rshift'};
  const slot=(key,rev)=>JOIN(s(rev?'__r':'__'),JOIN(key,s('__')));
  const cls=x=>item('InstCls',x), start=(cl,fn)=>item('FnStart',idx('FnName',JOIN(cl,JOIN(s('.'),fn))));
  vars('subFirst830','opKey830');
  proc('trySlot830',['obj','typ','meth','rhs','rt'],[
    IF(eq830(a('typ'),'O'),[c('nameHas776FnName',JOIN(cls(a('obj')),JOIN(s('.'),a('meth')))),
      IF(hasMethod(),[c('egCallback764',a('obj'),a('meth'),a('rhs'),a('rt')),stop()])]),...result(s('NotImplemented'),'?')]);
  proc('binTry830',['l','lt','r','rt','op','key','first','same'],[
    IF(eq830(a('first'),'1'),[c('trySlot830',a('r'),a('rt'),slot(a('key'),true),a('l'),a('lt')),IF(OR(NOT(ok()),NOT(type('?'))),[stop()])]),
    c('trySlot830',a('l'),a('lt'),slot(a('key'),false),a('r'),a('rt')),IF(OR(NOT(ok()),NOT(type('?'))),[stop()]),
    IF(AND(eq830(a('first'),'0'),eq830(a('same'),'0')),[c('trySlot830',a('r'),a('rt'),slot(a('key'),true),a('l'),a('lt')),IF(OR(NOT(ok()),NOT(type('?'))),[stop()])]),
    sv('beop',a('op')),sv('binL',a('l')),sv('binLT',a('lt')),sv('binR',a('r')),sv('binRT',a('rt')),c('binerr'),c('fail',JOIN(s('TypeError: '),v('p6msg')))]);
  proc('bin830',['l','lt','r','rt','op','key'],[
    sv('subFirst830',n(0)),IF(AND(eq830(a('lt'),'O'),eq830(a('rt'),'O')),[
      IF(EQ(cls(a('l')),cls(a('r'))),[c('binTry830',a('l'),a('lt'),a('r'),a('rt'),a('op'),a('key'),n(0),n(1)),stop()]),
      IF(NOT(EQ(start(cls(a('l')),slot(a('key'),true)),start(cls(a('r')),slot(a('key'),true)))),[
        sv('cname',cls(a('r'))),c('clsmro'),c('sfind',JOIN(s(','),JOIN(v('ev'),s(','))),JOIN(s(','),JOIN(cls(a('l')),s(',')))),IF(NOT(LT(v('ev'),n(0))),[sv('subFirst830',n(1))])])]),
    c('binTry830',a('l'),a('lt'),a('r'),a('rt'),a('op'),a('key'),v('subFirst830'),n(0))]);
  before('bcontro_tm6h4p0v',IF(OR(eq830(a('lefttype'),'O'),type('O')),
    Object.entries(kinds).map(([op,key])=>IF(eq830(a('op'),op),[c('bin830',a('leftval'),a('lefttype'),v('ev'),v('evtype'),a('op'),s(key)),stop()]))));
  proc('inplaceVal830',['l','r','rt'],[c('egCallback764',a('l'),s('__iadd__'),a('r'),a('rt')),
    IF(AND(ok(),type('?')),[c('bin830',a('l'),s('O'),a('r'),a('rt'),s('+'),s('add'))])]);
  proc('inplace830',['l','lt','op','lo','hi'],[
    IF(AND(eq830(a('lt'),'O'),eq830(a('op'),'+')),[method(a('l'),'__iadd__'),IF(hasMethod(),[
      c('eval',a('lo'),a('hi')),IF(NOT(ok()),[stop()]),c('inplaceVal830',a('l'),v('ev'),v('evtype')),stop()])]),
    c('rightside',a('l'),a('lt'),a('op'),a('lo'),a('hi'))]);
  // Retain each original expression input, only change the procedure and argument ids.
  for(const def of ['execute','aug242write %s %s %s %s %s %s']) for(const id of inDef(def)) {
    const b=BL()[id]; if(b.mutation?.proccode!=='rightside %s %s %s %s %s') continue;
    const proccode='inplace830 %s %s %s %s %s', proto=BL()[BL()[defIdOf(proccode)].inputs.custom_block[1]].mutation;
    const former=JSON.parse(b.mutation.argumentids).map(k=>b.inputs[k]);
    b.inputs=Object.fromEntries(JSON.parse(proto.argumentids).map((k,i)=>[k,former[i]]));
    b.mutation={...b.mutation,proccode,argumentids:proto.argumentids};
  }
  // attrDel781 is shared by del statements and delattr().
  enter('attrDel781 %s %s %s',IF(eq830(a('typ'),'O'),[method(a('obj'),'__delattr__'),IF(hasMethod(),[
    c('egCallback764',a('obj'),s('__delattr__'),a('name'),s('S')),IF(ok(),result(s(''),'Z')),stop()])]));
  proc('hasProp830',['obj','attr'],[c('readProp827',a('obj'),a('attr')),
    IF(ok(),[...result(n(1),'B'),stop()]),sv('p5a',item('InstCls',item('ErrV',n(1)))),sv('p5b',s('AttributeError')),c('issub'),
    IF(is('p5r','1'),[sv('error',s('')),clearL('ErrN'),clearL('ErrV'),clearL('ErrT'),...result(n(0),'B')])]);
  proc('hasFallback830',['obj','attr'],[c('egCallback764',a('obj'),s('__getattr__'),a('attr'),s('S')),
    IF(ok(),[...result(n(1),'B'),stop()]),sv('p5a',item('InstCls',item('ErrV',n(1)))),sv('p5b',s('AttributeError')),c('issub'),
    IF(is('p5r','1'),[sv('error',s('')),clearL('ErrN'),clearL('ErrV'),clearL('ErrT'),...result(n(0),'B')])]);
  for(const id of ['bcontro_rn5f1ay09','bcontro_rqlfekyu0'])before(id,IF(NOT(type('S')),[fail('TypeError: attribute name must be string'),stop()]));
  for(const id of ['bdatase_roj1w0fny','bdatase_rrzfkxwpy'])before(id,IF(AND(is('p19a','0'),is('p19c','O')),[method(v('p19b'),'__getattr__'),IF(hasMethod(),[c('hasFallback830',v('p19b'),v('ev')),stop()])]));
  for(const id of ['bdatase_rn6jeg8wm','bdatase_rqmcluicf']) before(id,IF(AND(is('p19c','O'),GT(idx('PropertyNames827',v('ev')),n(0))),[
    c('nameHas776FnName',JOIN(cls(v('p19b')),JOIN(s('.@get:'),v('ev')))),IF(hasMethod(),[c('hasProp830',v('p19b'),v('ev')),sv('pending',n(1)),stop()])]));
  proc('boundSelf830',['m'],[sv('bm787i',n(1)),REPEATU(OR(GT(v('bm787i'),lenOf(a('m'))),eq830(letterOf(v('bm787i'),a('m')),'.')),[chgV('bm787i',n(1))]),
    c('substr',a('m'),n(1),add830(v('bm787i'),-1)),sv('evtype',s('O')),sv('evK',s(''))]);
  for(const [id,name] of [['bcontro_53oxmze6j',()=>item('Tok',add830(a('lo'),2))],['bcontro_7p7sxb0ao',()=>v('atnm')]])
    before(id,IF(AND(type('M'),eq830(name(),'__self__')),[c('boundSelf830',v('ev')),stop()]));
});
