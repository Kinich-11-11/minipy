// MP-99: the maze-style LCG needs exact 62-bit products and a bitwise AND of that product.
// Products whose operands together have more than 15 digits now take the decimal-string path
// (bgmul) instead of rounding to a double, small big-int results come back as plain ints, and
// & | ^ on big values is computed bit by bit on the decimal strings (two's complement, the way
// CPython defines it for negatives).
patch('MP-99: exact big-integer products and bitwise operations',()=>{
  const has=(x,y)=>I('operator_contains',{inputs:{STRING1:B.REP(x,[10,'']),STRING2:B.REP(y,[10,''])}});
  const isInt=(t,x)=>OR(EQ(v(t),s('J')),AND(EQ(v(t),s('N')),AND(NOT(has(x,s('.'))),AND(NOT(has(x,s('e'))),NOT(has(x,s('E')))))));
  vars('jnv','jns','jev','btas','btbs','btls','btbig','btlo','btv','btres','btmx','btna','btma','btnb','btmb','btm','btw','bta','btb','btacc','btp','btra','btrb','btbit','bt2');
  const jnorm=newProc('jnorm263',[]).defId;
  const fast=newProc('btFast263 %s %s %s %s',['op','am','bm','as']).defId;
  const bt=newProc('bt263 %s %s %s',['op','a0','b0']).defId;
  attachBody(jnorm,[
    IF(EQ(v('evtype'),s('J')),[
      sv('jnv',v('ev')),sv('jev',v('ev')),sv('jns',s('0')),
      IF(EQ(letterOf(s('1'),v('ev')),s('-')),[
        c('substr',v('ev'),s('2'),lenOf(v('ev'))),sv('jnv',v('ev')),sv('jns',s('1'))]),
      sv('evtype',s('J')),
      c('bgcmp',v('jnv'),s('9007199254740992')),
      IF(NOT(GT(v('bgc'),s('0'))),[sv('evtype',s('N'))]),
      sv('ev',v('jev')),sv('evK',s(''))])]);
  const absOf=(arg,magVar,signVar)=>[
    sv(magVar,a(arg)),sv(signVar,s('0')),
    IF(EQ(letterOf(s('1'),v(magVar)),s('-')),[
      c('substr',v(magVar),s('2'),lenOf(v(magVar))),sv(magVar,v('ev')),sv(signVar,s('1'))])];
  const zeroOf=x=>EQ(v(x),s('0'));
  const bitOf=(ra,rb)=>[
    sv('btbit',s('0')),
    IF(EQ(a('op'),s('&')),[IF(AND(EQ(v(ra),s('1')),EQ(v(rb),s('1'))),[sv('btbit',s('1'))])]),
    IF(EQ(a('op'),s('|')),[IF(OR(EQ(v(ra),s('1')),EQ(v(rb),s('1'))),[sv('btbit',s('1'))])]),
    IF(EQ(a('op'),s('^')),[IF(NOT(EQ(v(ra),v(rb))),[sv('btbit',s('1'))])])];
  // Fast path: both operands non-negative and at least one fits in 53 bits. Only the low
  // 53 bits of the other operand can take part; the high digits pass through untouched.
  attachBody(fast,[
    IFELSE(EQ(a('as'),s('1')),[
      sv('btls',ADD(s('0'),a('am'))),sv('btbig',a('bm'))],[
      sv('btls',ADD(s('0'),a('bm'))),sv('btbig',a('am'))]),
    c('bgdv',v('btbig'),s('9007199254740992')),sv('btv',v('bgr')),sv('btlo',ADD(s('0'),v('bgr'))),
    sv('btp',s('1')),sv('btres',s('0')),sv('btmx',v('btlo')),
    IF(GT(v('btls'),v('btmx')),[sv('btmx',v('btls'))]),
    REPEATU(GT(v('btp'),v('btmx')),[
      sv('btra',MOD(FLOOR(DIV(v('btlo'),v('btp'))),s('2'))),
      sv('btrb',MOD(FLOOR(DIV(v('btls'),v('btp'))),s('2'))),
      sv('btbit',s('0')),
      IF(EQ(a('op'),s('&')),[IF(GT(MUL(v('btra'),v('btrb')),s('0')),[sv('btbit',s('1'))])]),
      IF(EQ(a('op'),s('|')),[IF(GT(ADD(v('btra'),v('btrb')),s('0')),[sv('btbit',s('1'))])]),
      IF(EQ(a('op'),s('^')),[IF(NOT(EQ(v('btra'),v('btrb'))),[sv('btbit',s('1'))])]),
      IF(EQ(v('btbit'),s('1')),[sv('btres',ADD(v('btres'),v('btp')))]),
      sv('btp',MUL(v('btp'),s('2')))]),
    IFELSE(EQ(a('op'),s('&')),[
      sv('ev',v('btres')),sv('evtype',s('N'))],[
      c('bgsub',v('btbig'),v('btv')),
      c('bgadd',v('bge'),v('btres')),sv('ev',v('bge')),sv('evtype',s('J')),c('jnorm263')]),
    sv('evK',s(''))]);
  attachBody(bt,[
    ...absOf('a0','btma','btna'),
    ...absOf('b0','btmb','btnb'),
    IF(AND(EQ(v('btna'),s('0')),EQ(v('btnb'),s('0'))),[
      c('bgcmp',v('btma'),s('9007199254740992')),sv('btas',s('1')),
      IF(GT(v('bgc'),s('0')),[sv('btas',s('0'))]),
      c('bgcmp',v('btmb'),s('9007199254740992')),sv('btbs',s('1')),
      IF(GT(v('bgc'),s('0')),[sv('btbs',s('0'))]),
      IF(EQ(v('btas'),s('1')),[c('btFast263',a('op'),v('btma'),v('btmb'),s('1')),stop()]),
      IF(EQ(v('btbs'),s('1')),[c('btFast263',a('op'),v('btma'),v('btmb'),s('0')),stop()])]),
    c('bgcmp',v('btma'),v('btmb')),sv('btm',v('btma')),
    IF(NOT(GT(v('bgc'),s('0'))),[sv('btm',v('btmb'))]),
    c('bgmul',v('btm'),s('2')),sv('btm',v('bge')),
    sv('btw',s('1')),
    c('bgcmp',v('btw'),v('btm')),
    REPEATU(GT(v('bgc'),s('0')),[
      c('bgmul',v('btw'),s('2')),sv('btw',v('bge')),
      c('bgcmp',v('btw'),v('btm'))]),
    IFELSE(EQ(v('btna'),s('1')),[
      c('bgsub',v('btw'),v('btma')),sv('bta',v('bge'))],[sv('bta',v('btma'))]),
    IFELSE(EQ(v('btnb'),s('1')),[
      c('bgsub',v('btw'),v('btmb')),sv('btb',v('bge'))],[sv('btb',v('btmb'))]),
    sv('btacc',s('0')),sv('btp',s('1')),
    REPEATU(OR(AND(EQ(a('op'),s('&')),OR(zeroOf('bta'),zeroOf('btb'))),AND(zeroOf('bta'),zeroOf('btb'))),[
      c('bgdv',v('bta'),s('2')),sv('btra',v('bgr')),sv('bta',v('bgq')),
      c('bgdv',v('btb'),s('2')),sv('btrb',v('bgr')),sv('btb',v('bgq')),
      ...bitOf('btra','btrb'),
      IF(EQ(v('btbit'),s('1')),[c('bgadd',v('btacc'),v('btp')),sv('btacc',v('bge'))]),
      c('bgmul',v('btp'),s('2')),sv('btp',v('bge'))]),
    c('bgmul',v('btacc'),s('2')),sv('bt2',v('bge')),
    c('bgcmp',v('bt2'),v('btw')),
    sv('ev',v('btacc')),
    IF(NOT(LT(v('bgc'),s('0'))),[c('bgsub',v('btw'),v('btacc')),sv('ev',JOIN(s('-'),v('bge')))]),
    sv('evtype',s('J')),sv('evK',s('')),
    c('jnorm263')]);
  // Exact products: operands whose decimal lengths add up to more than 15 digits cannot be
  // represented as a double, even when each operand fits on its own.
  const arith=BL()['bcontro_us6l7741h'];
  if(!arith)throw Error('big-number dispatch not found');
  const extra=AND(EQ(a('op'),s('*')),AND(AND(isInt('lt2',a('leftval')),isInt('evtype',v('ev'))),
    GT(ADD(lenOf(a('leftval')),lenOf(v('ev'))),s('15'))));
  arith.inputs.CONDITION[1]=OR(extra,arith.inputs.CONDITION[1]);
  after('bproced_us2byo379',c('jnorm263'));
  // Route bitwise ops on big values to the decimal-string implementation.
  const big=OR(EQ(v('lt2'),s('J')),OR(EQ(v('evtype'),s('J')),OR(GT(lenOf(a('leftval')),s('15')),GT(lenOf(v('ev')),s('15')))));
  before('bcontro_37rsb3mao',IF(AND(AND(isInt('lt2',a('leftval')),isInt('evtype',v('ev'))),big),[
    c('bt263',a('op'),a('leftval'),v('ev')),
    IF(NOT(ok()),[stop()]),
    stop()]));
});
