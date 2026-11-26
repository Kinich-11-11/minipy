// MP-94: chains like `a[0] = b[1] = 5` or `self.a = self.b = v`. The RHS is evaluated once,
// kept in a fresh @chain259 variable, and every target then runs through the ordinary
// statement dispatcher as `target = @chain259:N`, so subscripts, slices, attributes,
// properties and tuple targets all keep their usual semantics. Name-only chains stay on
// assignlist and everything without a second "=" is untouched.
patch('MP-94: chained assignment with subscript, attribute and tuple targets',()=>{
  const tok=i=>item('Tok',i),knd=i=>item('Kind',i);
  const zero=()=>s('0'),one=()=>s('1');
  const delta=(name,value)=>chgV(name,num(value));
  const open=i=>OR(EQ(tok(i),s('(')),OR(EQ(tok(i),s('[')),EQ(tok(i),s('{'))));
  const close=i=>OR(EQ(tok(i),s(')')),OR(EQ(tok(i),s(']')),EQ(tok(i),s('}'))));
  const bracketSteps=i=>[
    IF(open(i),[delta('chD',1)]),IF(close(i),[delta('chD',-1)]),
    IF(AND(EQ(v('chD'),zero()),AND(EQ(knd(i),s('I')),EQ(tok(i),s('lambda')))),[delta('chL',1)]),
    IF(AND(EQ(v('chD'),zero()),AND(GT(v('chL'),zero()),EQ(tok(i),s(':')))),[delta('chL',-1)])];
  const plainEq=i=>AND(EQ(v('chD'),zero()),AND(EQ(v('chL'),zero()),EQ(tok(i),s('='))));
  vars('chN','chLast','chAll','chPrev','chScan','chD','chL','chNext','chTgt','chCnt','chName');
  // Register every procedure first: chain263 is recursive and chainPrep263 calls both.
  const findId=newProc('chainFind263 %s %s',['from','hi']).defId;
  const dropId=newProc('chainDrop263 %s',['n']).defId;
  const trimId=newProc('chainTrim263 %s',['n']).defId;
  const stepId=newProc('chain263 %s %s %s %s %s',['start','pcx','nm0','vv0','tt0']).defId;
  const prepId=newProc('chainPrep263',[]).defId;
  // First plain "=" at or after @from, outside brackets and lambda parameter lists.
  attachBody(findId,[
    sv('chScan',a('from')),sv('chD',zero()),sv('chL',zero()),sv('chNext',zero()),
    REPEATU(OR(GT(v('chScan'),a('hi')),GT(v('chNext'),zero())),[
      IF(NOT(EQ(knd(v('chScan')),s('S'))),[
        ...bracketSteps(v('chScan')),
        IF(plainEq(v('chScan')),[sv('chNext',v('chScan'))])]),
      delta('chScan',1)])]);
  // Drop the first @n tokens of the current statement.
  attachBody(dropId,[
    sv('chScan',zero()),
    REPEATU(NOT(LT(v('chScan'),a('n'))),[del('Tok',one()),del('Kind',one()),delta('chScan',1)])]);
  // Drop every token past the first @n, so execute() sees the same statement we built.
  attachBody(trimId,[
    REPEATU(NOT(GT(llen('Tok'),a('n'))),[del('Tok',s('last')),del('Kind',s('last'))])]);
  // Assign the target ending at the next "=", then continue with the rest of the chain.
  attachBody(stepId,[
    c('tokenize',item('Code',a('pcx'))),
    sv('count',llen('Tok')),
    c('chainFind263',a('start'),v('count')),
    IF(EQ(v('chNext'),zero()),[stop()]),
    sv('chTgt',SUB(v('chNext'),SUB(a('start'),s('1')))),
    c('chainDrop263',SUB(a('start'),s('1'))),
    rep('Tok',ADD(v('chTgt'),s('1')),a('nm0')),
    rep('Kind',ADD(v('chTgt'),s('1')),s('I')),
    c('chainTrim263',ADD(v('chTgt'),s('1'))),
    sv('pc',a('pcx')),sv('dest',ADD(a('pcx'),one())),sv('pending',zero()),
    addTo('VStack',v('chNext')),
    c('execute'),
    sv('chNext',last('VStack')),del('VStack',s('last')),
    sv('pc',a('pcx')),sv('dest',ADD(a('pcx'),one())),sv('pending',zero()),
    IF(NOT(ok()),[stop()]),
    c('chain263',ADD(v('chNext'),one()),a('pcx'),a('nm0'),a('vv0'),a('tt0'))]);
  attachBody(prepId,[
    sv('chN',zero()),sv('chLast',zero()),sv('chAll',one()),sv('chPrev',one()),
    sv('chScan',one()),sv('chD',zero()),sv('chL',zero()),
    REPEATU(GT(v('chScan'),v('count')),[
      IF(NOT(EQ(knd(v('chScan')),s('S'))),[
        ...bracketSteps(v('chScan')),
        IF(plainEq(v('chScan')),[
          delta('chN',1),
          sv('chLast',v('chScan')),
          IF(NOT(AND(EQ(SUB(v('chScan'),one()),v('chPrev')),EQ(knd(v('chPrev')),s('I')))),[sv('chAll',zero())]),
          sv('chPrev',ADD(v('chScan'),one()))])]),
      delta('chScan',1)]),
    IF(NOT(GT(v('chN'),one())),[stop()]),
    IF(EQ(v('chAll'),one()),[stop()]),
    delta('chCnt',1),
    sv('chName',JOIN(s('@chain259:'),v('chCnt'))),
    addTo('VStack',v('chName')),
    c('evalCtx828',ADD(v('chLast'),one()),v('count'),zero()),
    sv('chName',last('VStack')),del('VStack',s('last')),
    IF(NOT(ok()),[sv('pending',one()),stop()]),
    c('assign',v('chName'),v('ev'),v('evtype')),
    c('chain263',one(),v('pc'),v('chName'),v('ev'),v('evtype')),
    IF(NOT(ok()),[sv('pending',one()),stop()]),
    sv('pending',one()),
    c('lookup',v('chName')),
    IF(GT(v('found'),zero()),[
      del('Names',v('found')),del('Values',v('found')),del('Types',v('found')),del('Show',v('found')),
      c('cellWrite763',v('chName'),s(''),s('U'))]),
    clearL('Tok'),clearL('Kind'),sv('count',zero()),
    sv('z736pc',zero()),sv('z736e',zero()),sv('z736c',zero())]);
  // Keep the temporary name and the last "=" position alive across user callbacks.
  const lastOf=id=>{let t=id;while(BL()[t].next)t=BL()[t].next;return t;};
  after(lastOf(defIdOf('fpush')),addTo('VSave',v('chName')),addTo('VSave',v('chLast')));
  after('bdatase_vehsbm8zw',
    sv('chName',item('VSave',ADD(v('epB'),s('140')))),
    sv('chLast',item('VSave',ADD(v('epB'),s('141')))));
  const shape=OR(AND(EQ(knd(one()),s('I')),
      OR(OR(EQ(tok(s('2')),s('=')),EQ(tok(s('2')),s('['))),OR(EQ(tok(s('2')),s('.')),EQ(tok(s('2')),s(','))))),
    OR(EQ(tok(one()),s('(')),EQ(tok(one()),s('['))));
  before('bcontro_5047gjz5d',IF(AND(is('pending','0'),AND(GT(v('count'),s('4')),shape)),[
    c('scount',item('Code',v('pc')),s('=')),
    IF(GT(v('ev'),s('1')),[c('chainPrep263')])]));
});
