// Evaluate arguments first, then acquire iterators; do not pull until next(). All
// continuations are stored per iterator (including the function and enumerate index).
patch('Lazy map, filter, enumerate and plain zip',()=>{
  lists('ArgsV830','ArgsT830','ArgsR830','LazyF830','LazyT830');
  vars('azPos830','azDepth830','azLambda830','azI830','azOut830','azSerial830','azTmp830','azKeep830');
  const inc=x=>chgV(x,n(1)), sep=(t,x)=>JOIN(v('lsep'),JOIN(t,x));
  const drop=l=>del(l,s('last')), put=(l,i,x)=>rep(l,i,x), tok=x=>item('Tok',x);
  const arg=(l,k)=>item(l,ADD(a('base'),n(k)));
  after('bdataad_8et2i12w',addTo('LazyF830',s('')),addTo('LazyT830',s('')));
  proc('asIter830',['val','type','ref'],[
    sv('ev',a('val')),sv('evtype',a('type')),IF(kind830(()=>a('type'),['Y','G']),[stop()]),
    IF(eq830(a('type'),'O'),[method(a('val'),'__iter__'),IF(hasMethod(),[...call0(a('val'),'__iter__'),IF(NOT(ok()),[stop()]),
      IF(kind830(()=>v('evtype'),['G','Y']),[stop()]),IF(type('O'),[method(v('ev'),'__next__'),IF(hasMethod(),[stop()])]),fail('TypeError: iter() returned non-iterator'),stop()]),
      method(a('val'),'__getitem__'),IF(hasMethod(),[c('lazyNew827',s('getitem830'),a('val')),stop()]),fail('TypeError: object is not iterable'),stop()]),
    IF(NOT(kind830(()=>a('type'),['L','T','D','E','S','K','I','V'])),[fail('TypeError: object is not iterable'),stop()]),
    IF(eq830(a('type'),'D'),[c('dictkeys',a('val'))]),IF(eq830(a('type'),'S'),[c('charsplit')]),IF(kind830(()=>a('type'),['K','V','I']),[c('view826',a('val'),a('type'))]),
    addTo('ItSrc',v('ev')),addTo('ItPos',n(1)),
    IF(AND(GT(a('ref'),n(0)),kind830(()=>a('type'),['L','D'])),[
      addTo('IterId827',llen('ItSrc')),addTo('IterRef827',a('ref')),addTo('IterKind827',a('type')),addTo('IterDead827',n(0)),c('listlen',a('val')),addTo('IterSize827',v('ev'))]),...result(llen('ItSrc'),'Y')]);
  proc('zipInputs830',['base','last','acc'],[]); // recursive construction, argument frames survive callbacks
  attachBody(defIdOf('zipInputs830 %s %s %s'),[
    IF(GT(a('base'),a('last')),[c('lazyNew827',n(0),a('acc')),stop()]),
    c('asIter830',item('ArgsV830',a('base')),item('ArgsT830',a('base')),item('ArgsR830',a('base'))),IF(NOT(ok()),[stop()]),
    c('lesc',v('ev')),c('zipInputs830',add830(a('base'),1),a('last'),JOIN(a('acc'),sep(v('evtype'),v('ev'))))]);
  proc('azMake830',['mode','base','cnt'],[
    IF(eq830(a('mode'),'zip'),[c('zipInputs830',add830(a('base'),1),ADD(a('base'),a('cnt')),s('')),stop()]),
    IF(eq830(a('mode'),'enumerate'),[IF(OR(LT(a('cnt'),n(1)),GT(a('cnt'),n(2))),[fail('TypeError: enumerate expects one or two arguments'),stop()]),
      IFELSE(EQ(a('cnt'),n(1)),result(n(0),'N'),[sv('ev',arg('ArgsV830',2)),sv('evtype',arg('ArgsT830',2)),IF(type('O'),[c('index830',v('ev'))])]),
      IF(NOT(ok()),[stop()]),IF(NOT(OR(type('J'),OR(type('B'),AND(type('N'),NOT(has830(v('ev'),s('.'))))))),[fail('TypeError: enumerate start must be an integer'),stop()]),
      addTo('VStack',v('ev')),c('asIter830',arg('ArgsV830',1),arg('ArgsT830',1),arg('ArgsR830',1)),IF(ok(),[addTo('VStack',v('evtype')),c('lazyNew827',s('enumerate'),v('ev')),
        put('LazyT830',llen('LazyT830'),last('VStack')),drop('VStack'),put('ItPos',v('ev'),last('VStack'))]),drop('VStack'),stop()]),
    IF(OR(LT(a('cnt'),n(2)),AND(eq830(a('mode'),'filter'),NOT(EQ(a('cnt'),n(2))))),[fail('TypeError: invalid number of iterable arguments'),stop()]),
    c('zipInputs830',add830(a('base'),2),ADD(a('base'),a('cnt')),s('')),IF(NOT(ok()),[stop()]),c('lazyNew827',a('mode'),v('ev')),
    put('LazyF830',llen('LazyF830'),arg('ArgsV830',1)),put('LazyT830',llen('LazyT830'),arg('ArgsT830',1))]);
  proc('azArg830',['mode','lo','hi','base'],[
    IF(AND(eq830(a('mode'),'enumerate'),AND(eq830(tok(a('lo')),'start'),eq830(tok(add830(a('lo'),1)),'='))),[c('eval',add830(a('lo'),2),a('hi')),stop()]),
    IF(AND(AND(EQ(a('lo'),a('hi')),EQ(llen('ArgsV830'),a('base'))),AND(kind830(()=>a('mode'),['map','filter']),any830(()=>tok(a('lo')),['int','str','float','bool','abs','len','list','tuple','sum','max','min','round','ord','chr']))),[
      c('lookup',tok(a('lo'))),IF(is('found','0'),[c('nameHas776FnName',tok(a('lo'))),IF(NOT(hasMethod()),[...result(tok(a('lo')),'native'),stop()])])]),
    c('eval',a('lo'),a('hi')),IF(AND(ok(),AND(EQ(a('lo'),a('hi')),AND(eq830(item('Kind',a('lo')),'I'),kind830(()=>v('evtype'),['L','D'])))),[c('refGet826',tok(a('lo')),v('ev'),llen('FrGen')),sv('valueRef827',v('rId826'))])]);
  const scan=newProc('azScan830 %s %s %s %s',['mode','lo','hi','base']).defId;
  proc('azOne830',['mode','lo','comma','hi','base'],[c('azArg830',a('mode'),a('lo'),add830(a('comma'),-1),a('base')),IF(NOT(ok()),[stop()]),
    addTo('ArgsV830',v('ev')),addTo('ArgsT830',v('evtype')),addTo('ArgsR830',v('valueRef827')),c('azScan830',a('mode'),add830(a('comma'),1),a('hi'),a('base'))]);
  attachBody(scan,[IF(GT(a('lo'),a('hi')),[c('azMake830',a('mode'),a('base'),SUB(llen('ArgsV830'),a('base'))),stop()]),
    sv('azDepth830',n(0)),sv('azLambda830',n(0)),sv('azPos830',a('lo')),
    REPEATU(GT(v('azPos830'),a('hi')),[IF(NOT(eq830(item('Kind',v('azPos830')),'S')),[
      IF(is('azDepth830','0'),[IF(eq830(tok(v('azPos830')),'lambda'),[inc('azLambda830')]),IF(AND(GT(v('azLambda830'),n(0)),eq830(tok(v('azPos830')),':')),[chgV('azLambda830',n(-1))]),
        IF(AND(is('azLambda830','0'),eq830(tok(v('azPos830')),',')),[c('azOne830',a('mode'),a('lo'),v('azPos830'),a('hi'),a('base')),stop()])]),
      IF(any830(()=>tok(v('azPos830')),['(','[','{']),[inc('azDepth830')]),IF(any830(()=>tok(v('azPos830')),[')',']','}']),[chgV('azDepth830',n(-1))])]),inc('azPos830')]),
    c('azOne830',a('mode'),a('lo'),add830(a('hi'),1),a('hi'),a('base'))]);
  proc('azCreate830',['mode','lo','hi','base'],[c('azScan830',a('mode'),a('lo'),a('hi'),a('base')),
    REPEATU(NOT(GT(llen('ArgsV830'),a('base'))),[...['ArgsV830','ArgsT830','ArgsR830'].map(drop)])]);
  for(const id of ['bdatase_my5ym37ek','bdatase_ihmduec4s','bproced_87hs7cf7v'])before(id,
    c('azCreate830',tok(a('lo')),add830(a('lo'),2),add830(a('hi'),-1),llen('ArgsV830')),chgV('fnlimit',n(-1)),stop());
  const nm=(serial,i)=>JOIN(s('@lazy830:'),JOIN(serial,JOIN(s(':'),i)));
  proc('apply830',['fn','ft','tuple','serial'],[
    IF(NOT(kind830(()=>a('ft'),['F','M','C','O','native'])),[fail('TypeError: object is not callable'),stop()]),
    c('egSave764'),IFELSE(eq830(a('ft'),'native'),[addTo('Tok',a('fn'))],[c('assign',nm(a('serial'),n(0)),a('fn'),a('ft')),addTo('Tok',nm(a('serial'),n(0)))]),
    addTo('Kind',s('I')),addTo('Tok',s('(')),addTo('Kind',s('O')),c('listlen',a('tuple')),sv('azI830',n(1)),REPEAT(v('ev'),[
      IF(GT(v('azI830'),n(1)),[addTo('Tok',s(',')),addTo('Kind',s('O'))]),c('listitem',a('tuple'),v('azI830')),c('assign',nm(a('serial'),v('azI830')),v('ev'),v('evtype')),
      addTo('Tok',nm(a('serial'),v('azI830'))),addTo('Kind',s('I')),inc('azI830')]),addTo('Tok',s(')')),addTo('Kind',s('O')),sv('count',llen('Tok')),
    c('eval',n(1),v('count')),addTo('VStack',v('ev')),addTo('VStack',v('evtype')),c('egRestore764'),c('listlen',a('tuple')),sv('azI830',n(1)),REPEAT(v('ev'),[
      c('egDrop764',nm(a('serial'),v('azI830'))),inc('azI830')]),IF(NOT(eq830(a('ft'),'native')),[c('egDrop764',nm(a('serial'),n(0)))]),
    sv('evtype',last('VStack')),drop('VStack'),sv('ev',last('VStack')),drop('VStack'),sv('evK',s(''))]);
  proc('filterOne830',['tuple','fn','ft'],[IFELSE(eq830(a('ft'),'Z'),[c('listitem',a('tuple'),n(1))],[inc('azSerial830'),c('apply830',a('fn'),a('ft'),a('tuple'),v('azSerial830'))]),
    IF(NOT(ok()),[stop()]),c('truth',v('ev'),v('evtype')),sv('azKeep830',v('truthv')),IF(is('azKeep830','1'),[c('listitem',a('tuple'),n(1))])]);
  const field=l=>item(l,a('row')), mode=t=>eq830(field('LazyMode827'),t), src=()=>field('LazyData827'), id=()=>field('LazyId827'),pos=()=>item('ItPos',id());
  before('bcontro_e4bu4kp3',IF(mode('getitem830'),[c('egCallback764',src(),s('__getitem__'),add830(pos(),-1),s('N')),
    IFELSE(ok(),[put('ItPos',id(),add830(pos(),1))],[IF(eq830(item('InstCls',item('ErrV',n(1))),'IndexError'),[put('LazyDone827',a('row'),n(1)),sv('error',s('')),c('genStop782',n(0),n(0))])]),stop()]),
    IF(mode('enumerate'),[c('nextPull785',src(),field('LazyT830')),IF(ok(),[c('lesc',v('ev')),sv('ev',JOIN(sep(s('N'),pos()),sep(v('evtype'),v('ev')))),sv('evtype',s('T')),put('ItPos',id(),add830(pos(),1))]),stop()]),
    IF(mode('map'),[c('nextPull785',src(),s('Y')),IF(ok(),[inc('azSerial830'),c('apply830',field('LazyF830'),field('LazyT830'),v('ev'),v('azSerial830'))]),stop()]),
    IF(mode('filter'),[sv('azKeep830',n(0)),REPEATU(OR(NOT(ok()),is('azKeep830','1')),[c('nextPull785',src(),s('Y')),IF(ok(),[c('filterOne830',v('ev'),field('LazyF830'),field('LazyT830'))])]),stop()]));
});
// Advance lazy comprehension sources between executions of the body. Eagerly
// draining here would reorder user callbacks relative to guards and expressions.
patch('Pull comprehensions from iterator continuations',()=>{
  proc('compIter830',['it','lo','be','hi','tail','dict'],[
    REPEATU(NOT(ok()),[c('csave'),c('egSave764'),c('nextPull785',a('it'),s('Y')),c('egRestore764'),c('crestore'),c('checkEnd827'),
      IF(OR(is('lazyEOF827','1'),NOT(ok())),[stop()]),sv('cvv',v('ev')),sv('cvt',v('evtype')),
      IFELSE(is('csingle','1'),[IF(GT(llen('CompFrame827'),n(0)),[c('compWrite827',item('Tok',add830(v('cqq'),1)),v('cvv'),v('cvt'))]),
        c('assign',item('Tok',add830(v('cqq'),1)),v('cvv'),v('cvt'))],[c('unpackto',v('ctgt'),v('cvv'))]),
      IF(NOT(ok()),[stop()]),c('csp'),c('cdo',a('lo'),a('be'),a('hi'),a('tail'),a('dict')),c('crp')])]);
  before('bcontro_ax1zzz95s',IF(is('cltyp','Y'),[c('compIter830',v('clist'),a('lo'),a('be'),a('hi'),add830(v('cend'),1),v('cdict')),stop()]));
});
