patch('Integer-index protocol, iterable materialization and closure deletion',()=>{
  proc('index830',['obj'],[method(a('obj'),'__index__'),IF(NOT(hasMethod()),[fail('TypeError: object cannot be interpreted as an integer'),stop()]),
    ...call0(a('obj'),'__index__'),IF(NOT(ok()),[stop()]),
    IF(NOT(OR(type('B'),OR(type('J'),AND(type('N'),AND(NOT(has830(v('ev'),s('.'))),has830(s('0123456789'),letterOf(lenOf(v('ev')),v('ev')))))))),[
      fail('TypeError: __index__ returned a non-int'),stop()]),sv('evtype',s('N'))]);
  const coerce=()=>IF(type('O'),[c('index830',v('ev'))]);
  for(const id of ['bcontro_1599zmk3b','bcontro_1f33myg1k','bcontro_1iv0bit46']) before(id,coerce(),IF(NOT(ok()),[stop()]));
  for(const id of inDef('uAt829 %s %s %s')) if(BL()[id].mutation?.proccode==='eval %s %s')after(id,coerce());
  for(const id of inDef('crng %s %s')) if(BL()[id].mutation?.proccode==='evalCtx828 %s %s %s')after(id,coerce());
  for(const id of ['wX]Z7bcVWwnUG+_V[fNo',':#.@U#6!B~*7v2A26,;j','I]r.LoYCp,KvqlC68KK;','Zg[5vn~NPO4L7%?h7Gik','3AB!-[:`vaQirKNxXJ++']) after(id,coerce());
  proc('material830',[],[IF(type('O'),[c('objiter')]),IF(NOT(ok()),[stop()]),IF(type('G'),[c('gconv')]),IF(type('Y'),[c('drain827',v('ev'))]),IF(NOT(ok()),[stop()]),
    IF(type('D'),[c('dictkeys',v('ev'))]),IF(kind830(()=>v('evtype'),['K','V','I']),[c('view826',v('ev'),v('evtype'))]),
    IF(type('S'),[c('charsplit')]),IF(kind830(()=>v('evtype'),['T','E']),[sv('evtype',s('L'))])]);
  before('bcontro_mfsklr0q',IF(NOT(type('L')),[c('material830')]),IF(NOT(ok()),[stop()]));
  for(const id of ['bcontro_jzn4rqmbh','bcontro_6xzkwxb0g']) before(id,IF(kind830(()=>v('evtype'),['O','Y','G','K','V','I']),[c('material830')]),IF(NOT(ok()),[stop()]));
  // After name-table deletion, clear the actual captured cell as well. The names
  // of unrelated frames are resolved by cellWrite763, just as for assignment.
  after('bdatade_5lbq5e91h',c('cellWrite763',item('Tok',n(2)),s(''),s('U')));
});
patch('Nested starred unpacking',()=>{
  lists('UnParts830','UnCursor830');vars('unI830','unDepth830','unText830','unCh830','unStar830','unOut830');
  const one=()=>n(1),inc=x=>chgV(x,one()),first=x=>letterOf(one(),x),rmLast=l=>del(l,s('last'));
  proc('unFields830',['pattern'],[sv('unI830',one()),sv('unDepth830',n(0)),sv('unText830',s('')),
    REPEATU(GT(v('unI830'),lenOf(a('pattern'))),[sv('unCh830',letterOf(v('unI830'),a('pattern'))),
      IFELSE(AND(is('unDepth830','0'),is('unCh830',',')),[addTo('UnParts830',v('unText830')),sv('unText830',s(''))],[
        sv('unText830',JOIN(v('unText830'),v('unCh830'))),IF(any830(()=>v('unCh830'),['(','[']),[inc('unDepth830')]),IF(any830(()=>v('unCh830'),[')',']']),[chgV('unDepth830',n(-1))])]),inc('unI830')]),
    IF(NOT(is('unText830','')),[addTo('UnParts830',v('unText830'))])]);
  proc('unRest830',['seq','lo','hi'],[sv('unOut830',s('')),sv('unI830',a('lo')),REPEATU(GT(v('unI830'),a('hi')),[c('listitem',a('seq'),v('unI830')),c('lesc',v('ev')),
    sv('unOut830',JOIN(v('unOut830'),JOIN(v('lsep'),JOIN(v('evtype'),v('ev'))))),inc('unI830')]),...result(v('unOut830'),'L')]);
  proc('unBind830',['field','value','type'],[
    IF(any830(()=>first(a('field')),['(','[']),[...result(a('value'),'L'),sv('evtype',a('type')),c('material830'),IF(NOT(ok()),[stop()]),
      IF(NOT(type('L')),[fail('TypeError: cannot unpack non-iterable object'),stop()]),addTo('VStack',v('ev')),c('substr',a('field'),n(2),add830(lenOf(a('field')),-1)),
      c('unpackto',v('ev'),last('VStack')),rmLast('VStack'),stop()]),
    IF(eq830(first(a('field')),'*'),[c('substr',a('field'),n(2),lenOf(a('field'))),c('assign',v('ev'),a('value'),a('type')),stop()]),c('assign',a('field'),a('value'),a('type'))]);
  proc('unEach830',['seq','base','fields','size','star'],[addTo('UnCursor830',one()),
    REPEATU(OR(NOT(ok()),GT(last('UnCursor830'),a('fields'))),[IFELSE(EQ(last('UnCursor830'),a('star')),[
      c('unRest830',a('seq'),a('star'),SUB(a('size'),SUB(a('fields'),a('star'))))],[
      IFELSE(AND(GT(a('star'),n(0)),GT(last('UnCursor830'),a('star'))),[c('listitem',a('seq'),ADD(last('UnCursor830'),SUB(a('size'),a('fields'))))],[c('listitem',a('seq'),last('UnCursor830'))])]),
      c('unBind830',item('UnParts830',ADD(a('base'),last('UnCursor830'))),v('ev'),v('evtype')),
      rep('UnCursor830',llen('UnCursor830'),add830(last('UnCursor830'),1))]),rmLast('UnCursor830')]);
  proc('unCheck830',['seq','base','fields','size'],[sv('unI830',one()),sv('unStar830',n(0)),REPEAT(a('fields'),[
    IF(eq830(first(item('UnParts830',ADD(a('base'),v('unI830')))),'*'),[IF(GT(v('unStar830'),n(0)),[fail('SyntaxError: multiple starred expressions in assignment'),stop()]),sv('unStar830',v('unI830'))]),inc('unI830')]),
    IF(OR(AND(is('unStar830','0'),NOT(EQ(a('fields'),a('size')))),LT(a('size'),add830(a('fields'),-1))),[fail('ValueError: wrong number of values to unpack'),stop()]),
    c('unEach830',a('seq'),a('base'),a('fields'),a('size'),v('unStar830'))]);
  proc('unPattern830',['pattern','seq','base'],[c('unFields830',a('pattern')),c('listlen',a('seq')),c('unCheck830',a('seq'),a('base'),SUB(llen('UnParts830'),a('base')),v('ev')),
    REPEATU(NOT(GT(llen('UnParts830'),a('base'))),[rmLast('UnParts830')])]);
  enter('unpackto %s %s',IF(has830(a('names'),s('*')),[c('unPattern830',a('names'),a('enc'),llen('UnParts830')),stop()]));
});

patch('Live keys-view set operations and multiple with items',()=>{
  vars('vRight830','vLeft830','wcAt830','wcPos830','wcDepth830');
  proc('viewValues830',['value','kind'],[sv('ev',a('value')),sv('evtype',a('kind')),c('material830'),
    IF(AND(ok(),NOT(type('L'))),[fail('TypeError: expected an iterable')])]);
  proc('viewCompare830',['left','right','op'],[
    c('setfilter',a('left'),a('right'),n(0)),addTo('VStack',v('ev')),c('setfilter',a('right'),a('left'),n(0)),
    sv('vRight830',EQ(lenOf(v('ev')),n(0))),sv('vLeft830',EQ(lenOf(last('VStack')),n(0))),del('VStack',s('last')),
    ...Object.entries({'==':()=>AND(v('vLeft830'),v('vRight830')),'!=':()=>NOT(AND(v('vLeft830'),v('vRight830'))),'<=':()=>v('vLeft830'),'>=':()=>v('vRight830'),'<':()=>AND(v('vLeft830'),NOT(v('vRight830'))),'>':()=>AND(v('vRight830'),NOT(v('vLeft830')))}).map(([op,val])=>IF(eq830(a('op'),op),result(val(),'B')))]);

  proc('viewSet830',['left','lt','right','rt','op'],[
    c('viewValues830',a('left'),a('lt')),IF(NOT(ok()),[stop()]),addTo('VStack',v('ev')),c('viewValues830',a('right'),a('rt')),
    IF(ok(),[IFELSE(any830(()=>a('op'),['&','|','^','-']),[c('setop',a('op'),last('VStack'),v('ev'))],[c('viewCompare830',last('VStack'),v('ev'),a('op'))])]),del('VStack',s('last'))]);
  before('bcontro_tm6h4p0v',IF(AND(OR(eq830(a('lefttype'),'K'),type('K')),OR(any830(()=>a('op'),['&','|','^','-']),AND(any830(()=>a('op'),['<','>','<=','>=','==','!=']),AND(kind830(()=>a('lefttype'),['K','E']),kind830(()=>v('evtype'),['K','E']))))),[
    c('viewSet830',a('leftval'),a('lefttype'),v('ev'),v('evtype'),a('op')),stop()]));
  // The ordinary with stack already unwinds in LIFO order. Enter each item with
  // the same suite bounds, registering it only after its own __enter__ succeeds.
  const scan=newProc('withScan830 %s %s %s %s',['lo','hi','begin','end']).defId;
  proc('withItem830',['mgr','kind','target','begin','end'],[IF(NOT(eq830(a('kind'),'O')),[fail('TypeError: object does not support the context manager protocol'),stop()]),
    c('egSave764'),c('withbind753',a('mgr'),a('target'),a('begin'),a('end')),c('egRestore764')]);
  proc('withOne830',['lo','hi','asAt','begin','end'],[
    IF(GT(a('asAt'),n(0)),[IF(NOT(AND(EQ(add830(a('asAt'),1),a('hi')),eq830(item('Kind',a('hi')),'I'))),[fail('SyntaxError: expected context manager name'),stop()]),
      c('eval',a('lo'),add830(a('asAt'),-1)),IF(ok(),[c('withItem830',v('ev'),v('evtype'),item('Tok',a('hi')),a('begin'),a('end'))]),stop()]),
    c('eval',a('lo'),a('hi')),IF(ok(),[c('withItem830',v('ev'),v('evtype'),s(''),a('begin'),a('end'))])]);
  proc('withMore830',['lo','comma','hi','asAt','begin','end'],[c('withOne830',a('lo'),add830(a('comma'),-1),a('asAt'),a('begin'),a('end')),
    IF(AND(ok(),NOT(GT(a('comma'),a('hi')))),[c('withScan830',add830(a('comma'),1),a('hi'),a('begin'),a('end'))])]);
  attachBody(scan,[sv('wcDepth830',n(0)),sv('wcAt830',n(0)),sv('wcPos830',a('lo')),
    REPEATU(GT(v('wcPos830'),a('hi')),[IF(NOT(eq830(item('Kind',v('wcPos830')),'S')),[
      IF(AND(is('wcDepth830','0'),eq830(item('Tok',v('wcPos830')),',')),[c('withMore830',a('lo'),v('wcPos830'),a('hi'),v('wcAt830'),a('begin'),a('end')),stop()]),
      IF(AND(is('wcDepth830','0'),eq830(item('Tok',v('wcPos830')),'as')),[sv('wcAt830',v('wcPos830'))]),
      IF(any830(()=>item('Tok',v('wcPos830')),['(','[','{']),[chgV('wcDepth830',n(1))]),IF(any830(()=>item('Tok',v('wcPos830')),[')',']','}']),[chgV('wcDepth830',n(-1))])]),chgV('wcPos830',n(1))]),
    c('withOne830',a('lo'),a('hi'),v('wcAt830'),a('begin'),a('end'))]);
  setStack('bcontro_17z8oy553q','SUBSTACK',[c('withScan830',n(2),add830(v('count'),-1),a('begin'),a('end')),stop()]);
});
