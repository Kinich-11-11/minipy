// Heap workspace is a stack of parallel value/type arrays; all comparisons run
// through MiniPy '<'. Restore the list through the original reference/aliases.
patch('heapq binary min-heap',()=>{
  lists('HeapV830','HeapT830','HeapNames830','HeapRet830');vars('hpI830','hpN830','hpChild830','hpIx830','hpLess830','hpOut830','hpName830');
  const rm=l=>del(l,s('last')), loc=i=>ADD(a('base'),i), val=(l,i)=>item(l,loc(i)), put=(l,i,x)=>rep(l,loc(i),x), modes=f=>any830(f,['heapify','heappush','heappop']);
  proc('heapLess830',['base','i','j'],[chgV('azSerial830',n(1)),c('opVal830',val('HeapV830',a('i')),val('HeapT830',a('i')),s('<'),val('HeapV830',a('j')),val('HeapT830',a('j')),v('azSerial830')),c('truth',v('ev'),v('evtype')),sv('hpLess830',v('truthv'))]);
  proc('heapSwap830',['base','i','j'],[...['HeapV830','HeapT830'].flatMap(l=>[addTo('VStack',val(l,a('i'))),put(l,a('i'),val(l,a('j'))),put(l,a('j'),last('VStack')),rm('VStack')])]);
  proc('heapSift830',['base','root','size','up'],[addTo('HeapRet830',a('root')),REPEATU(NOT(ok()),[IFELSE(eq830(a('up'),'1'),[
    IF(LT(last('HeapRet830'),n(2)),[rm('HeapRet830'),stop()]),sv('hpChild830',FLOOR(DIV(last('HeapRet830'),n(2)))),addTo('VStack',v('hpChild830')),
    c('heapLess830',a('base'),last('HeapRet830'),v('hpChild830'))],[sv('hpChild830',MUL(last('HeapRet830'),n(2))),IF(GT(v('hpChild830'),a('size')),[rm('HeapRet830'),stop()]),
    IF(LT(v('hpChild830'),a('size')),[addTo('VStack',v('hpChild830')),c('heapLess830',a('base'),v('hpChild830'),add830(v('hpChild830'),1)),sv('hpChild830',last('VStack')),rm('VStack'),IF(eq830(v('hpLess830'),'0'),[chgV('hpChild830',n(1))])]),
    addTo('VStack',v('hpChild830')),c('heapLess830',a('base'),v('hpChild830'),last('HeapRet830'))]),sv('hpChild830',last('VStack')),rm('VStack'),
    IF(OR(NOT(ok()),eq830(v('hpLess830'),'0')),[rm('HeapRet830'),stop()]),c('heapSwap830',a('base'),v('hpChild830'),last('HeapRet830')),rep('HeapRet830',llen('HeapRet830'),v('hpChild830'))]),rm('HeapRet830')]);
  proc('heapCommit830',['id','data','name'],[IF(NOT(eq830(a('name'),'')),[c('assign',a('name'),a('data'),s('L'))]),IF(GT(a('id'),n(0)),[rep('RefData826',a('id'),a('data')),
    sv('hpIx830',n(1)),REPEAT(llen('Names'),[IF(eq830(item('Types',v('hpIx830')),'L'),[c('refFind826',item('Names',v('hpIx830')),llen('FrGen')),
      IF(EQ(v('rId826'),a('id')),[rep('Values',v('hpIx830'),a('data'))])]),chgV('hpIx830',n(1))]),
    sv('hpIx830',n(1)),REPEAT(llen('AttrRef827'),[IF(EQ(item('AttrRef827',v('hpIx830')),a('id')),[rep('IAttrVal',item('AttrSlot827',v('hpIx830')),a('data'))]),chgV('hpIx830',n(1))])])]);
  proc('heapWork830',['mode','base','src','ref','nm','x','xt'],[c('listlen',a('src')),sv('hpN830',v('ev')),sv('hpI830',n(1)),REPEAT(v('hpN830'),[
    c('listitem',a('src'),v('hpI830')),addTo('HeapV830',v('ev')),addTo('HeapT830',v('evtype')),chgV('hpI830',n(1))]),
    IF(AND(eq830(a('mode'),'heappop'),is('hpN830','0')),[fail('IndexError: index out of range'),stop()]),
    IFELSE(eq830(a('mode'),'heappop'),[addTo('HeapRet830',val('HeapV830',n(1))),addTo('HeapRet830',val('HeapT830',n(1))),c('heapSwap830',a('base'),n(1),v('hpN830')),rm('HeapV830'),rm('HeapT830'),
      c('heapSift830',a('base'),n(1),add830(v('hpN830'),-1),n(0))],[addTo('HeapRet830',s('')),addTo('HeapRet830',s('Z')),
      IFELSE(eq830(a('mode'),'heappush'),[addTo('HeapV830',a('x')),addTo('HeapT830',a('xt')),c('heapSift830',a('base'),add830(v('hpN830'),1),add830(v('hpN830'),1),n(1))],[
        addTo('HeapRet830',FLOOR(DIV(v('hpN830'),n(2)))),REPEAT(last('HeapRet830'),[IF(ok(),[c('heapSift830',a('base'),last('HeapRet830'),SUB(llen('HeapV830'),a('base')),n(0))]),rep('HeapRet830',llen('HeapRet830'),add830(last('HeapRet830'),-1))]),rm('HeapRet830')])]),
    sv('hpOut830',s('')),sv('hpI830',n(1)),REPEAT(SUB(llen('HeapV830'),a('base')),[c('lesc',val('HeapV830',v('hpI830'))),sv('hpOut830',JOIN(v('hpOut830'),JOIN(v('lsep'),JOIN(val('HeapT830',v('hpI830')),v('ev'))))),chgV('hpI830',n(1))]),
    c('heapCommit830',a('ref'),v('hpOut830'),a('nm')),REPEAT(SUB(llen('HeapV830'),a('base')),[rm('HeapV830'),rm('HeapT830')]),sv('evtype',last('HeapRet830')),rm('HeapRet830'),sv('ev',last('HeapRet830')),rm('HeapRet830'),sv('evK',s(''))]);
  enter('azMake830 %s %s %s',IF(modes(()=>a('mode')),[IF(OR(OR(AND(eq830(a('mode'),'heappush'),NOT(EQ(a('cnt'),n(2)))),AND(NOT(eq830(a('mode'),'heappush')),NOT(EQ(a('cnt'),n(1))))),
    OR(NOT(eq830(item('ArgsK830',add830(a('base'),1)),'')),AND(EQ(a('cnt'),n(2)),NOT(eq830(item('ArgsK830',add830(a('base'),2)),''))))),[fail('TypeError: invalid heapq arguments'),stop()]),
    IF(NOT(eq830(item('ArgsT830',add830(a('base'),1)),'L')),[fail('TypeError: heap argument must be a list'),stop()]),
    c('heapWork830',a('mode'),llen('HeapV830'),item('ArgsV830',add830(a('base'),1)),item('ArgsR830',add830(a('base'),1)),last('HeapNames830'),item('ArgsV830',add830(a('base'),2)),item('ArgsT830',add830(a('base'),2))),stop()]));
  enter('modroute %s %s %s',IF(AND(is('mmod','heapq'),modes(()=>a('mrfnn'))),[IFELSE(AND(eq830(item('Kind',a('mrlo')),'I'),OR(EQ(a('mrlo'),a('mrhi')),eq830(item('Tok',add830(a('mrlo'),1)),','))),[
    addTo('HeapNames830',item('Tok',a('mrlo')))],[addTo('HeapNames830',s(''))]),c('azCreate830',a('mrfnn'),a('mrlo'),a('mrhi'),llen('ArgsV830')),rm('HeapNames830'),stop()]));
});
