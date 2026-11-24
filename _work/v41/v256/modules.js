// Small native module surface: module guards still reject unimplemented names.
patch('itertools continuations and functools.reduce',()=>{
  lists('AlSrc830','AlAcc830','AlType830','AlFn830','AlFT830','AlState830','RedHave830');vars('scanEnd830','scanN830','redPos830','redInit830','redFn830');
  const tok=i=>item('Tok',i), k=i=>item('Kind',i), ix=i=>add830(a('base'),i), get=(l,i)=>item(l,ix(i)), rm=l=>del(l,s('last'));
  for(const id of ['bcontro_2nkrcmhsw','bcontro_8ey3lj29m']){const b=BL()[id],old=b.inputs.CONDITION[1];b.inputs.CONDITION=B.BOOL(AND(old,NOT(any830(()=>tok(n(2)),['itertools','functools','heapq','collections']))));}
  after('bdataad_8et2i12w',...['AlSrc830','AlAcc830','AlType830','AlFn830','AlFT830','AlState830'].map(l=>addTo(l,s(''))));
  const row=l=>item(l,a('row')), set=(l,r,x)=>rep(l,r,x), put=(l,x)=>set(l,a('row'),x),
    tagged=(t,x)=>JOIN(v('lsep'),JOIN(t,x));
  proc('binaryApply830',['fn','ft','x','xt','y','yt'],[IF(eq830(a('ft'),'plus'),[chgV('azSerial830',n(1)),c('opVal830',a('x'),a('xt'),s('+'),a('y'),a('yt'),v('azSerial830')),stop()]),
    c('lesc',a('x')),addTo('VStack',tagged(a('xt'),v('ev'))),c('lesc',a('y')),chgV('azSerial830',n(1)),
    c('apply830',a('fn'),a('ft'),JOIN(last('VStack'),tagged(a('yt'),v('ev'))),v('azSerial830')),rm('VStack')]);
  proc('algPull830',['row','mode'],[
    IF(eq830(a('mode'),'accumulate'),[IF(eq830(row('AlState830'),'initial'),[put('AlState830',s('acc')),sv('ev',row('AlAcc830')),sv('evtype',row('AlType830')),stop()]),
      c('nextPull785',row('LazyData827'),row('AlSrc830')),IF(NOT(ok()),[stop()]),
      IF(eq830(row('AlState830'),'acc'),[c('binaryApply830',row('AlFn830'),row('AlFT830'),row('AlAcc830'),row('AlType830'),v('ev'),v('evtype'))]),
      IF(ok(),[put('AlAcc830',v('ev')),put('AlType830',v('evtype')),put('AlState830',s('acc'))]),stop()]),
    REPEATU(NOT(ok()),[IF(NOT(eq830(row('AlState830'),'inner')),[c('nextPull785',row('LazyData827'),row('AlSrc830')),c('checkEnd827'),
      IF(is('lazyEOF827','1'),[put('LazyDone827',n(1)),c('genStop782',n(0),n(0)),stop()]),IF(NOT(ok()),[stop()]),c('asIter830',v('ev'),v('evtype'),n(0)),IF(NOT(ok()),[stop()]),
      put('AlAcc830',v('ev')),put('AlType830',v('evtype')),put('AlState830',s('inner'))]),c('nextPull785',row('AlAcc830'),row('AlType830')),c('checkEnd827'),
      IFELSE(is('lazyEOF827','1'),[put('AlState830',s('outer'))],[stop()])])]);
  before('bcontro_e4bu4kp3',IF(any830(()=>row('LazyMode827'),['accumulate','chain830']),[c('algPull830',a('row'),row('LazyMode827')),stop()]));
  proc('initAlg830',['mode','it','t','fn','ft','init','initialType','state'],[c('lazyNew827',a('mode'),a('it')),
    ...[['AlSrc830','t'],['AlFn830','fn'],['AlFT830','ft'],['AlAcc830','init'],['AlType830','initialType'],['AlState830','state']].map(([l,arg])=>set(l,llen(l),a(arg)))]);
  proc('reduceLoop830',['it','type','fn','ft','have'],[addTo('RedHave830',a('have')),REPEATU(NOT(ok()),[c('egSave764'),c('nextPull785',a('it'),a('type')),c('egRestore764'),c('checkEnd827'),
    IF(is('lazyEOF827','1'),[IF(eq830(last('RedHave830'),'0'),[fail('TypeError: reduce of empty iterable with no initial value')]),rm('RedHave830'),stop()]),
    IF(ok(),[IF(eq830(last('RedHave830'),'1'),[c('binaryApply830',a('fn'),a('ft'),last('ProdV830'),last('ProdT830'),v('ev'),v('evtype'))]),
      set('ProdV830',llen('ProdV830'),v('ev')),set('ProdT830',llen('ProdT830'),v('evtype')),set('RedHave830',llen('RedHave830'),n(1))])]),rm('RedHave830')]);
  proc('accState830',['it','t','init','fn'],[sv('redFn830',item('ArgsT830',a('fn'))),IF(OR(EQ(a('fn'),n(0)),is('redFn830','Z')),[sv('redFn830',s('plus'))]),
    sv('azTmp830',s('none')),IF(AND(GT(a('init'),n(0)),NOT(eq830(item('ArgsT830',a('init')),'Z'))),[sv('azTmp830',s('initial'))]),
    c('initAlg830',s('accumulate'),a('it'),a('t'),item('ArgsV830',a('fn')),v('redFn830'),item('ArgsV830',a('init')),item('ArgsT830',a('init')),v('azTmp830'))]);
  proc('makeAcc830',['base','init','fn'],[c('asIter830',get('ArgsV830',1),get('ArgsT830',1),get('ArgsR830',1)),IF(NOT(ok()),[stop()]),
    c('accState830',v('ev'),v('evtype'),a('init'),a('fn'))]);
  proc('algReady830',['mode','base','cnt'],[sv('redPos830',n(0)),sv('redInit830',n(0)),sv('redFn830',n(0)),sv('azI830',ix(1)),sv('azOut830',s('')),
    REPEAT(a('cnt'),[IFELSE(eq830(item('ArgsK830',v('azI830')),''),[chgV('redPos830',n(1)),IF(eq830(a('mode'),'chain'),[c('lesc',item('ArgsV830',v('azI830'))),sv('azOut830',JOIN(v('azOut830'),tagged(item('ArgsT830',v('azI830')),v('ev'))))])],[
      IFELSE(AND(eq830(a('mode'),'accumulate'),eq830(item('ArgsK830',v('azI830')),'initial')),[IF(GT(v('redInit830'),n(0)),[fail('TypeError: repeated keyword argument'),stop()]),sv('redInit830',v('azI830'))],[
        IFELSE(AND(eq830(a('mode'),'accumulate'),eq830(item('ArgsK830',v('azI830')),'func')),[sv('redFn830',v('azI830'))],[fail('TypeError: unexpected keyword argument'),stop()])])]),chgV('azI830',n(1))]),
    IF(eq830(a('mode'),'chain'),[c('asIter830',v('azOut830'),s('T'),n(0)),c('initAlg830',s('chain830'),v('ev'),v('evtype'),s(''),s(''),s(''),s(''),s('outer')),stop()]),
    IF(eq830(a('mode'),'from_iterable'),[IF(NOT(is('redPos830','1')),[fail('TypeError: from_iterable expects one argument'),stop()]),c('asIter830',get('ArgsV830',1),get('ArgsT830',1),get('ArgsR830',1)),
      IF(ok(),[c('initAlg830',s('chain830'),v('ev'),v('evtype'),s(''),s(''),s(''),s(''),s('outer'))]),stop()]),
    IF(eq830(a('mode'),'accumulate'),[IF(OR(LT(v('redPos830'),n(1)),GT(v('redPos830'),n(2))),[fail('TypeError: accumulate takes one or two positional arguments'),stop()]),
      IF(is('redPos830','2'),[IF(GT(v('redFn830'),n(0)),[fail('TypeError: multiple values for func'),stop()]),sv('redFn830',ix(2))]),
      c('makeAcc830',a('base'),v('redInit830'),v('redFn830')),stop()]),
    IF(OR(LT(v('redPos830'),n(2)),GT(v('redPos830'),n(3))),[fail('TypeError: reduce takes two or three arguments'),stop()]),
    addTo('ProdV830',get('ArgsV830',3)),addTo('ProdT830',get('ArgsT830',3)),c('asIter830',get('ArgsV830',2),get('ArgsT830',2),get('ArgsR830',2)),
    IF(ok(),[c('reduceLoop830',v('ev'),v('evtype'),get('ArgsV830',1),get('ArgsT830',1),SUB(a('cnt'),n(2)))]),sv('ev',last('ProdV830')),sv('evtype',last('ProdT830')),rm('ProdV830'),rm('ProdT830'),sv('evK',s(''))]);
  const modes=()=>any830(()=>a('mode'),['accumulate','reduce','chain','from_iterable']);
  enter('azMake830 %s %s %s',IF(modes(),[c('algReady830',a('mode'),a('base'),a('cnt')),stop()]));
  enter('modroute %s %s %s',IF(OR(AND(is('mmod','itertools'),any830(()=>a('mrfnn'),['accumulate','chain'])),AND(is('mmod','functools'),eq830(a('mrfnn'),'reduce'))),[
    c('azCreate830',a('mrfnn'),a('mrlo'),a('mrhi'),llen('ArgsV830')),stop()]));
  proc('callEnd830',['open','hi'],[sv('scanEnd830',a('open')),sv('scanN830',n(0)),REPEATU(GT(v('scanEnd830'),a('hi')),[
    IF(NOT(eq830(k(v('scanEnd830')),'S')),[IF(eq830(tok(v('scanEnd830')),'('),[chgV('scanN830',n(1))]),IF(eq830(tok(v('scanEnd830')),')'),[chgV('scanN830',n(-1)),IF(is('scanN830','0'),[stop()])])]),chgV('scanEnd830',n(1))])]);
  for(const off of [0,2]){const at=i=>tok(add830(a('lo'),off+i)), mod=()=>tok(a('lo'));
    enter('evalCtx828 %s %s %s',IF(AND(eq830(at(0),'chain'),AND(eq830(at(1),'.'),AND(eq830(at(2),'from_iterable'),eq830(at(3),'(')))),[
      IF(off?AND(eq830(tok(add830(a('lo'),1)),'.'),eq830(item('ModC',idx('ModS',mod())),'itertools')):eq830(item('FmM',idx('FmN',mod())),'itertools'),[
        c('callEnd830',add830(a('lo'),off+3),a('hi')),IF(EQ(v('scanEnd830'),a('hi')),[c('azCreate830',s('from_iterable'),add830(a('lo'),off+4),add830(a('hi'),-1),llen('ArgsV830')),stop()])])]));}
});
