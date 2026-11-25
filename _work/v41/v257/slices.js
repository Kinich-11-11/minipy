patch('MP-93: evaluate slice components, then apply the index protocol',()=>{
  const args=(...keys)=>keys.map(a), bodyRef=['data','kind','ref'], bounds=['start','st','end','et'];
  const has=(x,y)=>I('operator_contains',{inputs:{STRING1:B.REP(x,[10,'']),STRING2:B.REP(y,[10,''])}});
  const goodInt=()=>OR(type('J'),AND(type('N'),AND(NOT(has(v('ev'),s('.'))),AND(NOT(has(v('ev'),s('e'))),has(s('0123456789'),letterOf(lenOf(v('ev')),v('ev')))))));
  const sliceError=()=>fail('TypeError: slice indices must be integers or None or have an __index__ method');
  const quit=()=>IF(NOT(ok()),[stop()]);
  const pack=()=>[c('listitem',a('data'),plus831(v('uPos829'),1)),
    IF(GT(v('itemRef827'),n(0)),[sv('ev',v('itemRef827')),IFELSE(type('D'),[sv('evtype',s('&'))],[sv('evtype',s('!'))])]),
    c('lesc',v('ev')),sv('uOut829',JOIN(v('uOut829'),JOIN(v('lsep'),JOIN(v('evtype'),v('ev')))))];
  proc('sliceIndex831',['x','t'],[
    sv('ev',a('x')),sv('evtype',a('t')),sv('evK',s('')),
    IF(type('Z'),[stop()]),IF(type('O'),[method(a('x'),'__index__'),IF(NOT(hasMethod()),[sliceError(),stop()]),
      ...call0(a('x'),'__index__'),quit(),IF(NOT(OR(type('B'),goodInt())),[sv('p6v',v('ev')),sv('p6t',v('evtype')),c('tname'),c('fail',JOIN(s('TypeError: __index__ returned non-int (type '),JOIN(v('p6msg'),s(')')))),stop()])]),
    IF(type('B'),[...result(ADD(n(0),v('ev')),'N'),stop()]),IF(NOT(goodInt()),[sliceError(),stop()]),sv('evtype',s('N'))]);
  // All user code has finished before this loop. Share the original signed-bound
  // clipping/iteration blocks with strings; list/tuple elements retain their reference tags.
  const walk=newProc('sliceWalk831 %s %s %s %s %s %s %s',['data','kind',...bounds,'step']).defId;
  const clip=BL()['bproced_4orw8pn8'].next;
  const first=IFELSE(eq831(a('kind'),'S'),[c('uScan829',a('data'),n(1))],[c('listlen',a('data')),sv('uLen829',v('ev'))]);
  attachBody(walk,[first]); BL()[first].next=clip;
  replaceStmt('bdatase_6wvs1agt',IFELSE(eq831(a('kind'),'S'),[sv('uOut829',JOIN(v('uOut829'),item('UChars829',plus831(v('uPos829'),1))))],pack()));
  replaceStmt('bdatase_71oxnvdw',sv('evtype',a('kind')));after('bdatase_72z0xram',
    IFELSE(eq831(a('kind'),'L'),[addTo('RefData826',v('ev')),sv('valueRef827',llen('RefData826'))],[sv('valueRef827',n(0))]));
  attachBody(defIdOf('uSliceRun829 %s %s %s %s %s %s'),[c('sliceWalk831',a('text'),s('S'),...args(...bounds,'step'))]);
  // Each call captures its inputs in a Scratch procedure frame: recursion in an
  // expression or an __index__ callback cannot clobber the enclosing slice.
  proc('sliceFinish831',[...bodyRef,'start','st','step','end','et'],[
    c('sliceIndex831',a('end'),a('et')),quit(),
    IF(GT(a('ref'),n(0)),[c('sliceWalk831',item('RefData826',a('ref')),a('kind'),a('start'),a('st'),v('ev'),v('evtype'),a('step')),stop()]),
    c('sliceWalk831',a('data'),a('kind'),a('start'),a('st'),v('ev'),v('evtype'),a('step'))]);
  proc('sliceStart831',[...bodyRef,...bounds,'step'],[
    c('sliceIndex831',a('start'),a('st')),quit(),c('sliceFinish831',...args(...bodyRef),v('ev'),v('evtype'),...args('step','end','et'))]);
  proc('sliceStep831',[...bodyRef,...bounds,'c2','hi'],[
    c('uBound829',plus831(a('c2'),1),a('hi')),quit(),c('sliceIndex831',v('ev'),v('evtype')),quit(),
    IF(type('Z'),result(n(1),'N')),IF(is('ev','0'),[fail('ValueError: slice step cannot be zero'),stop()]),
    c('sliceStart831',...args(...bodyRef,...bounds),v('ev'))]);
  proc('sliceEnd831',[...bodyRef,'start','st','c1','c2','hi'],[
    c('uBound829',plus831(a('c1'),1),plus831(a('c2'),-1)),quit(),
    c('sliceStep831',...args(...bodyRef,'start','st'),v('ev'),v('evtype'),...args('c2','hi'))]);
  proc('slice831',[...bodyRef,'lo','hi','c1','c2'],[
    c('uBound829',a('lo'),plus831(a('c1'),-1)),quit(),
    c('sliceEnd831',...args(...bodyRef),v('ev'),v('evtype'),...args('c1','c2','hi'))]);
  attachBody(defIdOf('uSlice829 %s %s %s %s %s'),[c('slice831',a('text'),s('S'),n(0),...args('lo','hi','c1','c2'))]);
  vars('sliceRef831');
  // For direct list receivers, keep the owner rather than a snapshot across callbacks.
  proc('seqSlice831',['data','kind','lo','br','hi','c1','c2','owner'],[
    sv('sliceRef831',n(0)),IF(eq831(a('kind'),'L'),[
      IFELSE(AND(EQ(plus831(a('lo'),1),a('br')),eq831(item('Kind',a('lo')),'I')),[
        c('refGet826',item('Tok',a('lo')),a('data'),llen('FrGen')),sv('sliceRef831',v('rId826'))],[
        IF(OR(eq831(item('Tok',plus831(a('br'),-1)),']'),eq831(item('Tok',plus831(a('br'),-2)),'.')),[sv('sliceRef831',a('owner'))])])]),
    c('slice831',a('data'),a('kind'),v('sliceRef831'),plus831(a('br'),1),plus831(a('hi'),-1),a('c1'),a('c2'))]);

  // Named operands of 'is' need their owner IDs too, not payload equality. The
  // existing identity stack retains the left owner while evaluating the RHS.
  // cpyrec was a textual approximation for a[:]. Do not overwrite a real
  // shallow copy's new owner with the source's owner after bindRef827.
  guard('bcontro_o0ylasr4b','bcontro_o0ylasr4b',NOT(GT(v('valueRef827'),n(0))));
  const ident=()=>OR(eq831(a('op'),'is'),eq831(a('op'),'isnot'));
  const named=(lo,hi)=>IF(AND(ident(),AND(ok(),AND(OR(type('L'),type('D')),AND(EQ(lo(),hi()),eq831(item('Kind',lo()),'I'))))),[
    c('refGet826',item('Tok',lo()),v('ev'),llen('FrGen')),sv('valueRef827',v('rId826'))]);
  after('nZH}+P^|TjXtjp?sFMHe',named(()=>a('lo'),()=>plus831(a('cut'),-1)));
  after('k+6eCwci:M;M64tD_umG',named(()=>a('lo'),()=>a('hi')));
  // A bracket inside a string literal is neither an outer subscript nor the
  // end of a function call used as a bound (e.g. a[len("]"):]).
  for(const [id,key] of [['bcontro_o69bqtjvk','p375i'],['bcontro_o6gph9dg6','p375i'],['bcontro_o7aykolp2','p375i'],['bcontro_o7hs2kiyn','p375i'],['bcontro_7przqq7vb','pxj'],['bcontro_7pvxuqsns','pxj']]){
    const cond=BL()[id].inputs.CONDITION;cond[1]=AND(NOT(eq831(item('Kind',v(key)),'S')),cond[1]);}
  for(const id of ['bcontro_bdnrg9v0','bcontro_bix267v0','bcontro_bpkt9zdj']){
    const condition=BL()[id].inputs.CONDITION;condition[1]=AND(NOT(is('eopK','S')),condition[1]);}
  before('bcontro_6p7rhfb6n',IF(AND(OR(is('xb','L'),is('xb','T')),GT(v('xcol2'),n(0))),[fail('SyntaxError: too many slice separators'),stop()]));
  before('bcontro_6syoo09v2',IF(OR(is('xb','L'),is('xb','T')),[IF(is('xcol2','0'),[sv('xcol2',a('hi'))]),
    c('seqSlice831',v('xa'),v('xb'),a('lo'),v('xbr'),a('hi'),v('xcol'),v('xcol2'),v('valueRef827')),stop()]));
});
