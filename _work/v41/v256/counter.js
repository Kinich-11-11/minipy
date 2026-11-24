// A Counter owns an ordinary MiniPy dictionary, shared by views and aliases.
// Counts supplied by a mapping are copied, while iterable elements count once.
patch('collections.Counter storage and multiset addition',()=>{
  lists('CounterIds830','CounterRefs830','CounterPos830');vars('ctKey830','ctType830','ctPos830');
  const rm=l=>del(l,s('last')),at=(o)=>idx('CounterIds830',o),ref=o=>item('CounterRefs830',at(o)),data=o=>item('RefData826',ref(o)),
    ct=(o,t)=>AND(eq830(t,'O'),GT(at(o),n(0))),incPos=k=>rep('CounterPos830',llen('CounterPos830'),add830(last('CounterPos830'),k));
  proc('ctNew830',[],[addTo('InstCls',s('Counter')),addTo('CounterIds830',llen('InstCls')),addTo('RefData826',s('')),addTo('CounterRefs830',llen('RefData826')),...result(llen('InstCls'),'O')]);
  proc('ctGet830',['id','key','kt','default','dt'],[c('hashCheck821',a('key'),a('kt')),IF(NOT(is('hc821bad','')),[c('fail',JOIN(s('TypeError: unhashable type: '),v('hc821bad'))),stop()]),IF(NOT(ok()),[stop()]),
    c('dictKeyFind820',data(a('id')),a('key'),a('kt')),IFELSE(GT(v('kf820pos'),n(0)),[c('listitem',data(a('id')),add830(v('kf820pos'),1))],[sv('ev',a('default')),sv('evtype',a('dt')),sv('evK',s(''))])]);
  proc('ctStore830',['id','key','kt','v','t'],[c('dsetv',data(a('id')),a('key'),a('kt'),a('t'),a('v')),IF(ok(),[rep('RefData826',ref(a('id')),v('ev'))])]);
  proc('ctWrite830',['id','key','kt','v','t','add'],[c('ctGet830',a('id'),a('key'),a('kt'),n(0),s('N')),IF(NOT(ok()),[stop()]),
    IFELSE(AND(eq830(a('add'),'1'),GT(v('kf820pos'),n(0))),[chgV('azSerial830',n(1)),c('opVal830',v('ev'),v('evtype'),s('+'),a('v'),a('t'),v('azSerial830'))],[sv('ev',a('v')),sv('evtype',a('t'))]),
    IF(ok(),[c('ctStore830',a('id'),a('key'),a('kt'),v('ev'),v('evtype'))])]);
  proc('ctWalk830',['id','rec','kind'],[c('listlen',a('rec')),addTo('CounterPos830',n(1)),REPEAT(DIV(v('ev'),n(2)),[IF(ok(),[c('listitem',a('rec'),last('CounterPos830')),
    addTo('VStack',v('ev')),addTo('VStack',v('evtype')),c('listitem',a('rec'),add830(last('CounterPos830'),1)),
    IFELSE(eq830(a('kind'),'positive'),[addTo('VStack',v('ev')),addTo('VStack',v('evtype')),chgV('azSerial830',n(1)),c('opVal830',v('ev'),v('evtype'),s('>'),n(0),s('N'),v('azSerial830')),
      c('truth',v('ev'),v('evtype')),IF(AND(ok(),NOT(is('truthv','0'))),[c('ctStore830',a('id'),item('VStack',add830(llen('VStack'),-3)),item('VStack',add830(llen('VStack'),-2)),item('VStack',add830(llen('VStack'),-1)),last('VStack'))]),rm('VStack'),rm('VStack')],[
      c('ctWrite830',a('id'),item('VStack',add830(llen('VStack'),-1)),last('VStack'),v('ev'),v('evtype'),n(1))]),rm('VStack'),rm('VStack'),incPos(2)])]),rm('CounterPos830')]);
  proc('ctItems830',['id','it','t'],[REPEATU(NOT(ok()),[c('egSave764'),c('nextPull785',a('it'),a('t')),c('egRestore764'),c('checkEnd827'),IF(OR(is('lazyEOF827','1'),NOT(ok())),[stop()]),
    c('ctWrite830',a('id'),v('ev'),v('evtype'),n(1),s('N'),n(1))])]);
  proc('ctFill830',['id','src','t','ref'],[IF(ct(a('src'),a('t')),[c('ctWalk830',a('id'),data(a('src')),s('add')),stop()]),
    IF(eq830(a('t'),'D'),[c('ctWalk830',a('id'),a('src'),s('add')),stop()]),c('asIter830',a('src'),a('t'),a('ref')),IF(ok(),[c('ctItems830',a('id'),v('ev'),v('evtype'))])]);
  proc('ctArgs830',['id','base','cnt'],[addTo('CounterPos830',add830(a('base'),1)),REPEAT(a('cnt'),[IF(ok(),[IFELSE(eq830(item('ArgsK830',last('CounterPos830')),''),[
    IFELSE(EQ(last('CounterPos830'),add830(a('base'),1)),[c('ctFill830',a('id'),item('ArgsV830',last('CounterPos830')),item('ArgsT830',last('CounterPos830')),item('ArgsR830',last('CounterPos830')))],[fail('TypeError: Counter expects at most one positional argument')])],[
    c('ctWrite830',a('id'),item('ArgsK830',last('CounterPos830')),s('S'),item('ArgsV830',last('CounterPos830')),item('ArgsT830',last('CounterPos830')),n(1))]),incPos(1)])]),rm('CounterPos830'),...result(a('id'),'O')]);
  enter('azMake830 %s %s %s',IF(eq830(a('mode'),'Counter'),[c('ctNew830'),c('ctArgs830',v('ev'),a('base'),a('cnt')),stop()]));
  enter('modroute %s %s %s',IF(AND(is('mmod','collections'),eq830(a('mrfnn'),'Counter')),[c('azCreate830',s('Counter'),a('mrlo'),a('mrhi'),llen('ArgsV830')),stop()]));
  proc('ctPlus830',['id','l','r'],[c('ctWalk830',a('id'),data(a('l')),s('add')),IF(ok(),[c('ctWalk830',a('id'),data(a('r')),s('add'))]),IF(NOT(ok()),[stop()]),
    addTo('VStack',data(a('id'))),rep('RefData826',ref(a('id')),s('')),c('ctWalk830',a('id'),last('VStack'),s('positive')),rm('VStack'),...result(a('id'),'O')]);
  enter('bin830 %s %s %s %s %s %s',IF(AND(eq830(a('op'),'+'),AND(ct(a('l'),a('lt')),ct(a('r'),a('rt')))),[c('ctNew830'),c('ctPlus830',v('ev'),a('l'),a('r')),stop()]));
  proc('ctSub830',['id','lo','hi'],[c('eval',a('lo'),a('hi')),IF(ok(),[c('ctGet830',a('id'),v('ev'),v('evtype'),n(0),s('N'))])]);
  after('bdatase_arhj4x7j',IF(ct(v('xa'),v('xb')),[c('ctSub830',v('xa'),add830(v('xbr'),1),add830(a('hi'),-1)),stop()]));
  proc('ctKV830',['id','lo','sep','hi'],[c('eval',add830(a('sep'),2),a('hi')),IF(NOT(ok()),[stop()]),addTo('VStack',v('ev')),addTo('VStack',v('evtype')),c('eval',add830(a('lo'),2),add830(a('sep'),-1)),
    IF(ok(),[c('ctWrite830',a('id'),v('ev'),v('evtype'),item('VStack',add830(llen('VStack'),-1)),last('VStack'),n(0))]),rm('VStack'),rm('VStack')]);
  before('bcontro_6llb3eiwg',IF(ct(v('isRec'),v('isRecT')),[c('ctKV830',v('isRec'),a('lo'),v('isSp'),a('hi')),stop()]));
  proc('ctMethod830',['id','m','lo','hi'],[...Object.entries({keys:'K',values:'V',items:'I'}).map(([m,t])=>IF(eq830(a('m'),m),[IF(NOT(GT(a('lo'),a('hi'))),[fail('TypeError: view method takes no arguments'),stop()]),...result(ref(a('id')),t),stop()])),
    IF(eq830(a('m'),'get'),[c('dictmeth',data(a('id')),s(''),s('get'),a('lo'),a('hi')),stop()]),
    IF(eq830(a('m'),'copy'),[c('ctNew830'),rep('RefData826',ref(v('ev')),data(a('id'))),stop()]),
    c('fail',JOIN(s("AttributeError: Counter has no attribute '"),JOIN(a('m'),s("'"))))]);
  enter('callmeth %s %s %s %s',IF(GT(at(a('inst')),n(0)),[c('ctMethod830',a('inst'),a('meth'),a('lo'),a('hi')),stop()]));
  before('bcontro_7i192j1wh',IF(ct(v('xa'),v('xb')),[c('ctMethod830',v('xa'),item('Tok',add830(a('lo'),2)),add830(a('lo'),4),add830(a('hi'),-1)),stop()]));
  for(const id of ['bcontro_72f3uwc2','bcontro_7hnisdqb'])before(id,IF(AND(ct(v('ev'),v('evtype')),any830(()=>a('fn'),['len','list','tuple','iter','set','sorted','min','max','sum'])),[c('dictkeys',data(v('ev'))),sv('evtype',s('L'))]));
  enter('truth %s %s',IF(ct(a('vv'),a('vt')),[sv('truthv',GT(lenOf(data(a('vv'))),n(0))),stop()]));
  enter('asIter830 %s %s %s',IF(ct(a('val'),a('type')),[c('asIter830',data(a('val')),s('D'),ref(a('val'))),stop()]));
  enter('hObject830 %s',IF(GT(at(a('obj')),n(0)),[sv('hc821bad',s('Counter')),stop()]));
  for(const id of ['bcontro_2fspf4m8','bdatase_awpixhnqp'])before(id,IF(ct(v('ev'),v('evtype')),[c('dictkeys',data(v('ev'))),sv('evtype',s('L'))]));
});
