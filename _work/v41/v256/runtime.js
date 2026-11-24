const add830=(x,k)=>ADD(x,n(k)), z830=()=>n(0), one830=()=>n(1);
const has830=(x,y)=>I('operator_contains',{inputs:{STRING1:B.REP(x,[10,'']),STRING2:B.REP(y,[10,''])}});
const abs830=x=>I('operator_mathop',{fields:{OPERATOR:['abs',null]},inputs:{NUM:B.REP(x,[4,'0'])}});
const eq830=(x,t)=>EQ(x,s(t));
const any830=(x,values)=>values.map(t=>eq830(x(),t)).reduce((l,r)=>OR(l,r));
const kind830=(x,values)=>any830(x,values);
const zeroPow830=(base,exp)=>IF(AND(EQ(base,n(0)),LT(exp,n(0))),[fail('ZeroDivisionError: 0.0 cannot be raised to a negative power'),stop()]);
patch('Exact mixed numeric comparisons and complex operations',()=>{
  vars('cmpMag830','cmpSign830','cmpRes830','cmpDigits830');
  // Reconstruct the integer part of a binary64 without ever converting a long
  // *Python integer* to binary64. Power-of-two quotient and remainder are exact.
  const radix=()=>n(16777216);
  const digitsDef=newProc('floatDigits830 %s',['f']).defId;
  attachBody(digitsDef,[
    IF(LT(a('f'),n(9007199254740992)),[sv('cmpDigits830',FLOOR(a('f'))),stop()]),
    c('floatDigits830',FLOOR(DIV(a('f'),radix()))),c('bgmul',v('cmpDigits830'),radix()),
    c('bgadd',v('bge'),MOD(a('f'),radix())),sv('cmpDigits830',v('bge'))]);
  proc('mixedCmp830',['iv','fv','op','rev'],[
    IF(any830(()=>a('fv'),['nan','-nan']),[...result(eq830(a('op'),'!='),'B'),stop()]),
    IFELSE(OR(any830(()=>a('fv'),['inf','infinity','-inf','-infinity']),GT(abs830(a('fv')),n(Number.MAX_VALUE))),[
      IFELSE(eq830(letterOf(n(1),a('fv')),'-'),[sv('cmpRes830',n(1))],[sv('cmpRes830',n(-1))])],[
      sv('cmpSign830',eq830(letterOf(n(1),a('iv')),'-')),
      IFELSE(NOT(EQ(v('cmpSign830'),LT(a('fv'),n(0)))),[
        IFELSE(is('cmpSign830','true'),[sv('cmpRes830',n(-1))],[sv('cmpRes830',n(1))])],[
        sv('cmpMag830',a('iv')),IF(eq830(letterOf(n(1),a('iv')),'-'),[c('substr',a('iv'),n(2),lenOf(a('iv'))),sv('cmpMag830',v('ev'))]),
        c('floatDigits830',FLOOR(abs830(a('fv')))),c('bgcmp',v('cmpMag830'),v('cmpDigits830')),sv('cmpRes830',v('bgc')),
        IF(AND(is('cmpRes830','0'),GT(MOD(abs830(a('fv')),n(1)),n(0))),[sv('cmpRes830',n(-1))]),
        IF(eq830(letterOf(n(1),a('iv')),'-'),[sv('cmpRes830',SUB(n(0),v('cmpRes830')))])])]),
    IF(EQ(a('rev'),n(1)),[sv('cmpRes830',SUB(n(0),v('cmpRes830')))]),
    ...['<','<=','==','!=','>=','>'].map((op,i)=>IF(eq830(a('op'),op),result([()=>LT(v('cmpRes830'),n(0)),()=>NOT(GT(v('cmpRes830'),n(0))),()=>EQ(v('cmpRes830'),n(0)),()=>NOT(EQ(v('cmpRes830'),n(0))),()=>NOT(LT(v('cmpRes830'),n(0))),()=>GT(v('cmpRes830'),n(0))][i](),'B')))]);
  const fl=(t,x)=>AND(eq830(t(),'N'),OR(any830(x,['inf','-inf','nan','infinity','-infinity']),OR(has830(x(),s('.')),has830(x(),s('e')))));
  const big=(t,x)=>OR(eq830(t(),'J'),AND(eq830(t(),'N'),AND(GT(lenOf(x()),n(15)),NOT(fl(t,x)))));
  const lt=()=>a('lefttype'), lv=()=>a('leftval'), rt=()=>v('evtype'), rv=()=>v('ev');
  before('bcontro_wyycd1du0',IF(any830(()=>a('op'),['<','<=','==','!=','>=','>']),[
    IF(AND(big(lt,lv),fl(rt,rv)),[c('mixedCmp830',lv(),rv(),a('op'),n(0)),stop()]),
    IF(AND(fl(lt,lv),big(rt,rv)),[c('mixedCmp830',rv(),lv(),a('op'),n(1)),stop()])]),
    IF(AND(eq830(a('op'),'**'),AND(kind830(lt,['N','J','B']),kind830(rt,['N','J','B']))),[zeroPow830(lv(),rv())]));
  enter('powval %s %s',zeroPow830(a('base'),a('exp')));
  for(const id of ['19?@UBoZVYB8koto/mut','bwr_p0olim5pb']) prependStack(id,'SUBSTACK',IF(type('CPX'),[fail('TypeError: cannot convert complex to a real number'),stop()]));
  const conj=(value,lo,hi)=>[IF(GT(hi(),lo()),[c('ex232args',add830(lo(),1),hi()),IF(ok(),[fail('TypeError: conjugate takes no arguments')]),stop()]),c('cpsplit',value()),c('cpset',v('cpRe'),SUB(n(0),v('cpIm'))),sv('evK',s('')),stop()];
  for(const id of ['bcontro_13x49pn0it','bcontro_13clbcg6tj']) prependStack(id,'SUBSTACK',IF(eq830(item('Tok',add830(v('zdot'),1)),'conjugate'),conj(rv,()=>add830(v('zdot'),2),()=>add830(a('hi'),-1))));
  before('bcontro_1aaal3ess',IF(AND(is('xb','CPX'),eq830(item('Tok',add830(a('lo'),2)),'conjugate')),conj(()=>v('xa'),()=>add830(a('lo'),3),()=>add830(a('hi'),-1))));
});
