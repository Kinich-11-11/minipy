// Resolve exception handlers against the imported module/name when the exception
// is matched. A private handler key does not make StatisticsError a global builtin.
patch('statistics exception import, qualification and base class',()=>{
  const stat=()=>s('StatisticsError'), mark=()=>s('@statistics.StatisticsError'), k=(i)=>item('Tok',i),
    local=()=>AND(GT(v('found'),n(0)),AND(eq830(item('Types',v('found')),'C'),EQ(item('Values',v('found')),stat())));
  lists('StatAliases830');vars('stRest830','stOut830','stOne830','stTmp830','stDot830');
  after('bdataad_xbp4ydku0',IF(AND(eq830(k(n(2)),'statistics'),EQ(k(v('mfk')),stat())),[
    sv('stTmp830',k(v('mfk'))),IF(eq830(k(add830(v('mfk'),1)),'as'),[chgV('mfk',n(2)),sv('stTmp830',k(v('mfk')))]),
    c('assign',v('stTmp830'),stat(),s('C')),addTo('StatAliases830',v('stTmp830'))]));
  enter('evalCtx828 %s %s %s',IF(AND(EQ(a('hi'),add830(a('lo'),2)),AND(eq830(k(add830(a('lo'),1)),'.'),EQ(k(a('hi')),stat()))),[
    IF(eq830(item('ModC',idx('ModS',k(a('lo')))),'statistics'),[c('lookup',k(a('lo'))),IF(is('found','0'),[...result(stat(),'C'),stop()])])]));
  before('bcontro_ca2sr8hyb',IF(is('c3c','.'),[sv('c3nm',JOIN(v('c3nm'),s('.')))]));
  proc('statClause830',['spec'],[sv('stRest830',a('spec')),sv('stOut830',s('')),
    REPEATU(is('stRest830',''),[sv('m3s',v('stRest830')),c('shead'),sv('stOne830',v('m3h')),c('stail'),sv('stRest830',v('m3r')),
      IFELSE(has830(v('stOne830'),s('.')),[c('sfind',v('stOne830'),s('.')),sv('stDot830',v('ev')),c('substr',v('stOne830'),n(1),v('stDot830')),sv('stTmp830',v('ev')),
        c('substr',v('stOne830'),add830(v('stDot830'),2),lenOf(v('stOne830'))),c('nameEq776',v('ev'),stat()),IF(AND(is('cs776ok','1'),eq830(item('ModC',idx('ModS',v('stTmp830'))),'statistics')),[c('lookup',v('stTmp830')),IF(is('found','0'),[sv('stOne830',mark())])])],[
        IF(GT(idx('StatAliases830',v('stOne830')),n(0)),[c('lookup',v('stOne830')),IF(local(),[sv('stOne830',mark())])])]),
      IF(NOT(is('stOut830','')),[sv('stOut830',JOIN(v('stOut830'),s(',')))]),sv('stOut830',JOIN(v('stOut830'),v('stOne830')))]),sv('c3nm',v('stOut830'))]);
  const needed=x=>OR(has830(x(),s('.')),GT(llen('StatAliases830'),n(0)));
  after('bdatase_dakerdvrp',IF(needed(()=>v('tnm')),[c('statClause830',v('tnm')),sv('tnm',v('c3nm'))]));
  after('bproced_cbym8djcq',IF(needed(()=>v('c3nm')),[c('statClause830',v('c3nm'))]));
  enter('isknown',IF(EQ(v('x7name'),mark()),[...result(n(1),'N'),stop()]));
  const statBases=x=>any830(x,['ValueError','Exception','BaseException','object']);
  for(const [id,key,hit] of [['bcontro_bo6ibvy3t','tnm','tcl'],['bcontro_c61vqnkbp','t2n','t2hit'],['bcontro_cbmxpi0wz','c3this','c3hit']]) before(id,
    IF(AND(EQ(item('InstCls',item('ErrV',n(1))),stat()),OR(EQ(v(key),mark()),statBases(()=>v(key)))),[sv(hit,n(1))]));
  enter('issub',IF(AND(EQ(v('p5a'),stat()),statBases(()=>v('p5b'))),[sv('p5r',n(1)),...result(n(1),'B'),stop()]));
  enter('isanc',IF(AND(EQ(v('p2c1'),stat()),statBases(()=>v('p2c2'))),[sv('p2r',n(1)),stop()]));
});
// Use the shared, nesting-aware argument scanner. Keep keyword *names* alongside
// evaluated arguments so nested math calls cannot overwrite an outer invocation.
patch('math.isclose and iterative math.prod',()=>{
  lists('ArgsK830','ProdV830','ProdT830'); vars('mtI830','mtPos830','mtRel830','mtAbs830','mtStart830','mtA830','mtB830','mtDiff830');
  const funcs=x=>any830(x,['isclose','prod']),tok=i=>item('Tok',i), rm=l=>del(l,s('last')),
    kw=()=>AND(eq830(item('Kind',a('lo')),'I'),eq830(tok(add830(a('lo'),1)),'='));
  enter('azArg830 %s %s %s %s',IF(AND(any830(()=>a('mode'),['isclose','prod','accumulate','reduce','chain','from_iterable','heapify','heappush','heappop','Counter']),kw()),[c('eval',add830(a('lo'),2),a('hi')),stop()]));
  const additions=[...inDef('azOne830 %s %s %s %s %s')].filter(id=>BL()[id].opcode==='data_addtolist' && BL()[id].fields.LIST[0]==='ArgsV830');
  if(additions.length!==1)throw Error('argument scanner changed');
  before(additions[0],IFELSE(AND(any830(()=>a('mode'),['isclose','prod','accumulate','reduce','chain','from_iterable','heapify','heappush','heappop','Counter']),kw()),[addTo('ArgsK830',tok(a('lo')))],[addTo('ArgsK830',s(''))]));
  const drops=[...inDef('azCreate830 %s %s %s %s')].filter(id=>BL()[id].opcode==='data_deleteoflist' && BL()[id].fields.LIST[0]==='ArgsV830');
  after(drops[0],rm('ArgsK830'));
  const nm=(i)=>JOIN(s('@mul830:'),JOIN(a('serial'),s(i)));
  proc('opVal830',['l','lt','op','r','rt','serial'],[c('egSave764'),c('assign',nm('l'),a('l'),a('lt')),c('assign',nm('r'),a('r'),a('rt')),
    addTo('Tok',nm('l')),addTo('Kind',s('I')),addTo('Tok',a('op')),addTo('Kind',s('O')),addTo('Tok',nm('r')),addTo('Kind',s('I')),sv('count',n(3)),c('eval',n(1),n(3)),
    addTo('VStack',v('ev')),addTo('VStack',v('evtype')),c('egDrop764',nm('l')),c('egDrop764',nm('r')),c('egRestore764'),
    sv('evtype',last('VStack')),rm('VStack'),sv('ev',last('VStack')),rm('VStack'),sv('evK',s(''))]);
  proc('prodLoop830',['it','itType'],[REPEATU(NOT(ok()),[c('egSave764'),c('nextPull785',a('it'),a('itType')),c('egRestore764'),c('checkEnd827'),
    IF(OR(NOT(ok()),is('lazyEOF827','1')),[stop()]),chgV('azSerial830',n(1)),c('opVal830',last('ProdV830'),last('ProdT830'),s('*'),v('ev'),v('evtype'),v('azSerial830')),
    rep('ProdV830',llen('ProdV830'),v('ev')),rep('ProdT830',llen('ProdT830'),v('evtype'))])]);
  proc('real830',['x','t'],[sv('ev',a('x')),sv('evtype',a('t')),IF(eq830(a('t'),'O'),[method(a('x'),'__float__'),IFELSE(hasMethod(),call0(a('x'),'__float__'),[c('index830',a('x'))])]),
    IF(NOT(ok()),[stop()]),IF(NOT(kind830(()=>v('evtype'),['N','J','B'])),[fail('TypeError: must be real number'),stop()]),
    IF(AND(type('J'),GT(abs830(v('ev')),n(Number.MAX_VALUE))),[fail('OverflowError: int too large to convert to float')])]);
  const f=k=>item('ArgsV830',v(k)), t=k=>item('ArgsT830',v(k)), first=()=>add830(a('base'),1), inf=x=>any830(x,['inf','infinity','-inf','-infinity']),nan=x=>any830(x,['nan','-nan']);
  const near = x => NOT(GT(v('mtDiff830'),x)), relBound = key => near(abs830(MUL(a('rel'),a(key))));
  proc('closeCalc830',['x','y','rel','abs'],[
    IF(OR(LT(a('rel'),n(0)),LT(a('abs'),n(0))),[fail('ValueError: tolerances must be non-negative'),stop()]),
    IF(OR(nan(()=>a('x')),nan(()=>a('y'))),[...result(n(0),'B'),stop()]),IF(EQ(a('x'),a('y')),[...result(n(1),'B'),stop()]),
    IF(OR(inf(()=>a('x')),inf(()=>a('y'))),[...result(n(0),'B'),stop()]),sv('mtDiff830',abs830(SUB(a('x'),a('y')))),
    ...result(OR(AND(NOT(nan(()=>a('abs'))),OR(inf(()=>a('abs')),near(a('abs')))),
      AND(NOT(nan(()=>a('rel'))),OR(inf(()=>a('rel')),OR(relBound('x'),relBound('y'))))),'B')]);
  const numAt=i=>c('real830',item('ArgsV830',i()),item('ArgsT830',i()));
  proc('closeArgs830',['base','rel','abs'],[
    numAt(first),IF(NOT(ok()),[stop()]),addTo('VStack',v('ev')),numAt(()=>add830(a('base'),2)),addTo('VStack',v('ev')),
    IF(ok(),[IFELSE(EQ(a('rel'),n(0)),result(n(1e-9),'N'),[numAt(()=>a('rel'))])]),addTo('VStack',v('ev')),
    IF(ok(),[IFELSE(EQ(a('abs'),n(0)),result(n(0),'N'),[numAt(()=>a('abs'))])]),
    IF(ok(),[c('closeCalc830',item('VStack',add830(llen('VStack'),-2)),item('VStack',add830(llen('VStack'),-1)),last('VStack'),v('ev'))]),rm('VStack'),rm('VStack'),rm('VStack')]);
  proc('mathReady830',['mode','base','cnt'],[sv('mtI830',first()),sv('mtPos830',n(0)),...['mtRel830','mtAbs830','mtStart830'].map(k=>sv(k,n(0))),
    REPEAT(a('cnt'),[IFELSE(eq830(item('ArgsK830',v('mtI830')),''),[chgV('mtPos830',n(1))],[
      ...[['rel_tol','mtRel830','isclose'],['abs_tol','mtAbs830','isclose'],['start','mtStart830','prod']].map(([kw,k,fn])=>IF(AND(eq830(a('mode'),fn),eq830(item('ArgsK830',v('mtI830')),kw)),[
        IF(GT(v(k),n(0)),[fail('TypeError: repeated keyword argument'),stop()]),sv(k,v('mtI830'))])),
      IF(NOT(OR(EQ(v('mtI830'),v('mtRel830')),OR(EQ(v('mtI830'),v('mtAbs830')),EQ(v('mtI830'),v('mtStart830'))))),[fail('TypeError: unexpected keyword argument'),stop()])]),chgV('mtI830',n(1))]),
    IF(eq830(a('mode'),'prod'),[IF(NOT(is('mtPos830','1')),[fail('TypeError: prod expects one positional argument'),stop()]),
      IFELSE(is('mtStart830','0'),[addTo('ProdV830',n(1)),addTo('ProdT830',s('N'))],[addTo('ProdV830',f('mtStart830')),addTo('ProdT830',t('mtStart830'))]),
      c('asIter830',item('ArgsV830',first()),item('ArgsT830',first()),item('ArgsR830',first())),IF(ok(),[c('prodLoop830',v('ev'),v('evtype'))]),
      sv('ev',last('ProdV830')),sv('evtype',last('ProdT830')),rm('ProdV830'),rm('ProdT830'),sv('evK',s('')),stop()]),
    IF(NOT(is('mtPos830','2')),[fail('TypeError: isclose expects two positional arguments'),stop()]),c('closeArgs830',a('base'),v('mtRel830'),v('mtAbs830'))]);
  before('bcontro_17gvuqt267',IF(funcs(()=>tok(add830(a('lo'),2))),[c('azCreate830',tok(add830(a('lo'),2)),add830(a('lo'),4),add830(a('hi'),-1),llen('ArgsV830')),stop()]));
  before('bcontro_17hkzf9pri',IF(AND(GT(idx('MFrom',tok(a('lo'))),n(0)),funcs(()=>tok(a('lo')))),[c('azCreate830',tok(a('lo')),add830(a('lo'),2),add830(a('hi'),-1),llen('ArgsV830')),chgV('fnlimit',n(-1)),stop()]));
  enter('azMake830 %s %s %s',IF(funcs(()=>a('mode')),[c('mathReady830',a('mode'),a('base'),a('cnt')),stop()]));
});
