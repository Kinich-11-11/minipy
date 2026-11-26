// MP-98: `f(*xs)` worked for user functions but every builtin fetched its arguments through the
// lazy az* scanner, which handed "*A" straight to the expression evaluator ("SyntaxError:
// missing expression"). Expand a leading star into one argument per element, like CPython.
patch('MP-98: star-argument expansion for builtin calls',()=>{
  vars('azS263','azL263','azN263');
  enter('azOne830 %s %s %s %s %s',IF(AND(EQ(item('Tok',a('lo')),s('*')),NOT(EQ(item('Kind',a('lo')),s('S')))),[
    c('evalCtx828',ADD(a('lo'),s('1')),SUB(a('comma'),s('1')),s('0')),
    IF(NOT(ok()),[stop()]),
    c('material830'),
    IF(NOT(ok()),[stop()]),
    IF(NOT(EQ(v('evtype'),s('L'))),[fail('TypeError: argument after * must be an iterable'),stop()]),
    sv('azL263',v('ev')),
    c('listlen',v('azL263')),sv('azN263',v('ev')),
    sv('azS263',s('1')),
    REPEATU(GT(v('azS263'),v('azN263')),[
      c('listitem',v('azL263'),v('azS263')),
      addTo('ArgsK830',s('')),addTo('ArgsV830',v('ev')),addTo('ArgsT830',v('evtype')),addTo('ArgsR830',s('0')),
      chgV('azS263',num(1))]),
    c('azScan830',a('mode'),ADD(a('comma'),s('1')),a('hi'),a('base')),
    stop()]));
});
