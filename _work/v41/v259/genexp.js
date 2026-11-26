// MP-97: generator expressions rebuild their body from token *values*; string tokens hold the
// decoded text, so `("{}".format(v) for v in xs)` used to re-tokenize as stray braces and fail
// with "SyntaxError: missing expression". Re-quote string tokens (and f-string bodies) while
// the synthetic generator source is assembled.
patch('MP-97: quote string tokens when rebuilding generator expression bodies',()=>{
  const kind=i=>item('Kind',i),tokv=i=>item('Tok',i);
  proc('srcTok263',['idx'],[
    sv('ev',tokv(a('idx'))),
    sv('evtype',kind(a('idx'))),
    sv('evK',s('')),
    IF(EQ(kind(a('idx')),s('S')),[c('reprval',tokv(a('idx')),s('S')),sv('evK',s(''))]),
    IF(EQ(kind(a('idx')),s('F')),[c('reprval',tokv(a('idx')),s('S')),sv('ev',JOIN(s('f'),v('ev'))),sv('evK',s(''))])]);
  vars('sxV','sxT','sxK');
  // $ev holds the generator id across this block; keep it out of srcTok263's way.
  before('bcontro_x4yarbq7u',sv('sxV',v('ev')),sv('sxT',v('evtype')),sv('sxK',v('evK')));
  before('bproced_x50j2qq54',sv('ev',v('sxV')),sv('evtype',v('sxT')),sv('evK',v('sxK')));
  for(const [stmt,indexVar,build] of [
    ['bdatase_x4rastl5a','gxji',()=>sv('gxej',v('ev'))],
    ['bdatase_x4vj4ks8n','gxji',()=>sv('gxej',JOIN(v('gxej'),JOIN(s(' '),v('ev'))))],
    ['bdatase_2eufyalab','gxj769',()=>sv('gxfilter769',JOIN(JOIN(v('gxfilter769'),s(' ')),v('ev')))]]){
    before(stmt,c('srcTok263',v(indexVar)));
    replaceStmt(stmt,build());
  }
});
