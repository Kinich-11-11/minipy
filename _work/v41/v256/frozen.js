// Immutable sets use their own one-character storage tag, including when nested
// in a tuple or used as a dictionary key. Their hash is insensitive to order.
patch('frozenset construction, read operations and key semantics',()=>{
  const rm=l=>del(l,s('last')), tok=i=>item('Tok',i), frozen=()=>type('~'), ftype=x=>eq830(x,'~');
  const orCond=(id,cond)=>{const b=BL()[id];b.inputs.CONDITION=B.BOOL(OR(b.inputs.CONDITION[1],cond));};
  proc('frozen830',['lo','hi'],[IF(GT(a('lo'),a('hi')),[...result(s(''),'~'),stop()]),c('ex232args',a('lo'),a('hi')),IF(NOT(ok()),[stop()]),
    addTo('VStack',v('ev')),c('listlen',v('ev')),IF(NOT(is('ev','1')),[rm('VStack'),fail('TypeError: frozenset expected at most one argument'),stop()]),
    c('listitem',last('VStack'),n(1)),rm('VStack'),IF(frozen(),[stop()]),c('material830'),IF(NOT(ok()),[stop()]),IF(NOT(type('L')),[fail('TypeError: object is not iterable'),stop()]),
    c('setnorm',v('ev')),IF(ok(),[sv('evtype',s('~'))])]);
  enter('evalCtx828 %s %s %s',IF(AND(EQ(a('hi'),add830(a('lo'),2)),AND(eq830(tok(a('lo')),'frozenset'),AND(eq830(tok(add830(a('lo'),1)),'('),eq830(tok(a('hi')),')')))),[
    c('lookup',s('frozenset')),IF(is('found','0'),[c('nameHas776FnName',s('frozenset')),IF(NOT(hasMethod()),[...result(s(''),'~'),stop()])])]));
  before('bproced_iqb63afd',IF(eq830(tok(a('lo')),'frozenset'),[c('lookup',s('frozenset')),IF(is('found','0'),[c('nameHas776FnName',s('frozenset')),IF(NOT(hasMethod()),[
    c('frozen830',add830(a('lo'),2),add830(a('hi'),-1)),chgV('fnlimit',n(-1)),stop()])])]));
  enter('tname',IF(is('p6t','~'),[sv('p6msg',s('frozenset')),stop()]));
  for(const id of ['bcontro_yquja07u','bwr_p460cc8o9'])prependStack(id,'SUBSTACK',IF(frozen(),[...result(s("<class 'frozenset'>"),'S'),sv('pending',n(1)),stop()]));
  for(const fn of ['reprval','strval']) enter(fn+' %s %s',IF(ftype(a('vt')),[IF(eq830(a('vv'),''),[...result(s('frozenset()'),'S'),stop()]),c('setfmt',a('vv')),...result(JOIN(s('frozenset('),JOIN(v('ev'),s(')'))),'S'),stop()]));
  enter('truth %s %s',IF(ftype(a('vt')),[sv('truthv',GT(lenOf(a('vv')),n(0))),stop()]));
  enter('material830',IF(frozen(),[sv('evtype',s('L')),stop()]));
  enter('asIter830 %s %s %s',IF(ftype(a('type')),[c('asIter830',a('val'),s('T'),n(0)),stop()]));
  for(const id of ['bcontro_72f3uwc2','bcontro_7hnisdqb']) before(id,IF(AND(frozen(),any830(()=>a('fn'),['list','tuple','sorted','set','iter','min','max','sum','all','any','len'])),[sv('evtype',s('L'))]));
  for(const id of ['bcontro_2fspf4m8','bdatase_awpixhnqp'])before(id,IF(frozen(),[sv('evtype',s('L'))]));
  proc('frHash830',['rec','cnt'],[addTo('HAcc830',n(1927868237)),addTo('HPos830',n(1)),REPEAT(a('cnt'),[IF(ok(),[c('listitem',a('rec'),last('HPos830')),c('hashVal830',v('ev'),v('evtype')),
    rep('HAcc830',llen('HAcc830'),MOD(ADD(last('HAcc830'),MUL(MOD(v('hValue830'),n(2147483647)),n(1009))),n(2147483647))),rep('HPos830',llen('HPos830'),add830(last('HPos830'),1))])]),
    sv('hValue830',last('HAcc830')),rm('HAcc830'),rm('HPos830')]);
  enter('hashVal830 %s %s',IF(ftype(a('t')),[c('listlen',a('x')),c('frHash830',a('x'),v('ev')),stop()]));
  enter('dictEqual791 %s %s %s %s',IF(AND(ftype(a('xt')),ftype(a('yt'))),[c('hSave830'),c('viewCompare830',a('x'),a('y'),s('==')),sv('hEq830',v('ev')),c('hRestore830'),sv('dk791eq',v('hEq830')),stop()]));
  for(const id of ['bcontro_60wsrgf1','bcontro_5dfjokfc'])orCond(id,is('dgkt','~'));
  for(const id of ['bcontro_vcehvwiy','bcontro_6nby9hd2'])orCond(id,is('isKeyT','~'));
  const pair=()=>AND(kind830(()=>a('lefttype'),['~','E','K']),kind830(()=>v('evtype'),['~','E','K']));
  before('bcontro_tm6h4p0v',IF(OR(ftype(a('lefttype')),frozen()),[
    IF(AND(frozen(),any830(()=>a('op'),['in','notin'])),[sv('evtype',s('E'))]),
    IF(AND(pair(),any830(()=>a('op'),['|','&','^','-','==','!=','<','>','<=','>='])),[c('viewSet830',a('leftval'),a('lefttype'),v('ev'),v('evtype'),a('op')),
      IF(AND(type('E'),ftype(a('lefttype'))),[sv('evtype',s('~'))]),stop()])]));
  before('bcontro_acjsw6s8s',IF(is('xb','~'),[IF(NOT(any830(()=>tok(add830(a('lo'),2)),['copy','union','intersection','difference','symmetric_difference','isdisjoint','issubset','issuperset'])),[
    c('fail',JOIN(s("AttributeError: 'frozenset' object has no attribute '"),JOIN(tok(add830(a('lo'),2)),s("'")))),stop()]),
    c('setmeth',v('xa'),tok(a('lo')),tok(add830(a('lo'),2)),add830(a('lo'),4),add830(a('hi'),-1)),IF(type('E'),[sv('evtype',s('~'))]),stop()]));
});
