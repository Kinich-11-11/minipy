// MP-95: `-self.items[n]` style unary operands. The methodcall fast path in evalCtx828 used to
// grab `-obj.method()` before the unary fallback and negate the bound method instead of the
// call result ("TypeError: numeric operand"). Keep the receiver fast path for plain values and
// let prefix -/+/~ go through the ordinary unary operand evaluation.
patch('MP-95: prefix minus on attribute and method results',()=>{
  const prefix=OR(EQ(item('Tok',a('lo')),s('-')),OR(EQ(item('Tok',a('lo')),s('+')),EQ(item('Tok',a('lo')),s('~'))));
  const b=BL()['bcontro_52fbsywla'];
  if(!b)throw Error('methodcall2 branch not found');
  b.inputs.CONDITION[1]=AND(NOT(AND(NOT(EQ(item('Kind',a('lo')),s('S'))),prefix)),b.inputs.CONDITION[1]);
});
