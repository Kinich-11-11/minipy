// Scratch's list-backed mapping keeps original keys. Store the last computed hash
// of a user instance separately; never use its string representation for equality.
patch('Object hash, unhashability and collided-key comparisons',()=>{
  lists('HashId830','HashVal830','HFrames830','HAcc830','HPos830');
  vars('hValue830','hSign830','hNum830','hShift830','hI830','hEq830');
  const rm=l=>del(l,s('last')), cls=x=>item('InstCls',x), clsKey=(x,t)=>JOIN(cls(x),s('.'+t));
  const saveNames=('ev evtype evK xa xb igev dgkey dgkt dgcp lt2 binL binLT binR binRT isKeyV isKeyT isKeyE isKeyF isRec isN isJ isF '
    +'kf820n kf820i kf820pos dli dln dlacc dlj dlk dlkt dlvv dlvt dlf lhf lhn lhi lhv lht seti setn sacc set820simple '
    +'ini lii inf inel dmk dmkt d9k d9kt qck qckt p11k p11kt hShift830').split(' ');
  proc('hSave830',[],saveNames.map(k=>addTo('HFrames830',v(k))));
  proc('hRestore830',[],saveNames.slice().reverse().flatMap(k=>[sv(k,last('HFrames830')),rm('HFrames830')]));
  const neg=x=>eq830(letterOf(n(1),x),'-'), integer=(t,x)=>OR(eq830(t(),'J'),OR(eq830(t(),'B'),AND(eq830(t(),'N'),AND(NOT(has830(x(),s('.'))),AND(NOT(has830(x(),s('e'))),has830(s('0123456789'),letterOf(lenOf(x()),x())))))));
  proc('hInt830',['x','custom'],[sv('hNum830',a('x')),IF(neg(a('x')),[c('substr',a('x'),n(2),lenOf(a('x'))),sv('hNum830',v('ev'))]),
    IF(GT(lenOf(v('hNum830')),n(15)),[sv('hSign830',n(1)),IF(eq830(a('custom'),'1'),[c('bgcmp',v('hNum830'),s('9223372036854775807')),sv('hSign830',v('bgc')),
      IF(AND(neg(a('x')),eq830(JOIN(s('#'),v('hNum830')),'#9223372036854775808')),[sv('hSign830',n(0))])]),
      IF(is('hSign830','1'),[c('bgdv',v('hNum830'),s('2305843009213693951')),sv('hNum830',v('bgr'))])]),
    sv('hValue830',v('hNum830')),IF(AND(neg(a('x')),NOT(is('hNum830','0'))),[sv('hValue830',JOIN(s('-'),v('hNum830')))]),IF(is('hValue830','-1'),[sv('hValue830',n(-2))])]);
  proc('hFloat830',['x'],[IF(any830(()=>a('x'),['nan','-nan']),[sv('hValue830',n(0)),stop()]),
    IF(any830(()=>a('x'),['inf','infinity','-inf','-infinity']),[IFELSE(neg(a('x')),[sv('hValue830',n(-314159))],[sv('hValue830',n(314159))]),stop()]),
    sv('hNum830',abs830(a('x'))),sv('hShift830',n(0)),REPEATU(EQ(FLOOR(v('hNum830')),v('hNum830')),[sv('hNum830',MUL(v('hNum830'),n(2))),chgV('hShift830',n(1))]),
    c('floatDigits830',v('hNum830')),sv('hNum830',v('cmpDigits830')),REPEAT(MOD(SUB(n(0),v('hShift830')),n(61)),[c('bgmul',v('hNum830'),n(2)),sv('hNum830',v('bge'))]),
    IF(neg(a('x')),[sv('hNum830',JOIN(s('-'),v('hNum830')))]),c('hInt830',v('hNum830'),n(0))]);
  proc('hObject830',['obj'],[sv('hc821bad',s('')),c('attrfind',cls(a('obj')),s('__hash__')),
    IF(AND(GT(v('ev'),n(0)),eq830(item('IAttrType',v('ev')),'Z')),[sv('hc821bad',cls(a('obj'))),stop()]),method(a('obj'),'__hash__'),
    IFELSE(hasMethod(),[...call0(a('obj'),'__hash__'),IF(NOT(ok()),[stop()]),IF(NOT(integer(()=>v('evtype'),()=>v('ev'))),[fail('TypeError: __hash__ method should return an integer'),stop()]),
      c('hInt830',v('ev'),n(1))],[method(a('obj'),'__eq__'),IF(hasMethod(),[sv('hc821bad',cls(a('obj'))),stop()]),sv('hValue830',a('obj'))]),
    IFELSE(GT(idx('HashId830',a('obj')),n(0)),[rep('HashVal830',idx('HashId830',a('obj')),v('hValue830'))],[addTo('HashId830',a('obj')),addTo('HashVal830',v('hValue830'))]),sv('hc821bad',s(''))]);
  const hdef=newProc('hashVal830 %s %s',['x','t']).defId;
  const hBad=()=>c('fail',JOIN(s("TypeError: unhashable type: '"),JOIN(v('hc821bad'),s("'"))));
  proc('hTuple830',['x','cnt'],[addTo('HAcc830',n(3430008)),addTo('HPos830',n(1)),REPEAT(a('cnt'),[IF(ok(),[c('listitem',a('x'),last('HPos830')),c('hashVal830',v('ev'),v('evtype')),
    rep('HAcc830',llen('HAcc830'),MOD(ADD(MUL(last('HAcc830'),n(1009)),MOD(v('hValue830'),n(2147483647))),n(2147483647))),rep('HPos830',llen('HPos830'),add830(last('HPos830'),1))])]),
    sv('hValue830',last('HAcc830')),rm('HAcc830'),rm('HPos830')]);
  proc('hText830',['x'],[sv('hI830',n(1)),sv('hValue830',n(0)),REPEAT(lenOf(a('x')),[c('uUnitOrd829',letterOf(v('hI830'),a('x')),n(0),n(65535)),
    sv('hValue830',MOD(ADD(MUL(v('hValue830'),n(1009)),v('ordCode829')),n(2147483647))),chgV('hI830',n(1))])]);
  attachBody(hdef,[IF(eq830(a('t'),'O'),[c('hObject830',a('x')),IF(AND(ok(),NOT(is('hc821bad',''))),[hBad()]),stop()]),
    IF(integer(()=>a('t'),()=>a('x')),[c('hInt830',a('x'),n(0)),stop()]),IF(eq830(a('t'),'N'),[c('hFloat830',a('x')),stop()]),
    IF(eq830(a('t'),'CPX'),[c('cpsplit',a('x')),addTo('HAcc830',v('cpIm')),c('hFloat830',v('cpRe')),IF(NOT(EQ(last('HAcc830'),n(0))),[
      addTo('HAcc830',v('hValue830')),c('hFloat830',item('HAcc830',add830(llen('HAcc830'),-1))),sv('hValue830',ADD(last('HAcc830'),MUL(n(1000003),v('hValue830')))),rm('HAcc830')]),rm('HAcc830'),stop()]),
    IF(kind830(()=>a('t'),['L','E','D','K','I']),[sv('p6t',a('t')),sv('p6v',a('x')),c('tname'),sv('hc821bad',v('p6msg')),hBad(),stop()]),
    IF(eq830(a('t'),'T'),[c('listlen',a('x')),c('hTuple830',a('x'),v('ev')),stop()]),IF(eq830(a('t'),'S'),[c('hText830',a('x')),stop()]),c('hText830',JOIN(a('t'),a('x')))]);
  enter('hashCheck821 %s %s',IF(eq830(a('t'),'O'),[c('hSave830'),c('hObject830',a('x')),c('hRestore830'),stop()]));
  for(const b of Object.values(BL())) if(b.opcode==='operator_contains' && b.inputs.STRING1?.[1]?.[1]==='|L|D|E|T|')b.inputs.STRING1[1][1]='|L|D|E|T|O|';
  const orCond=(id,cond)=>{const b=BL()[id];b.inputs.CONDITION=B.BOOL(OR(b.inputs.CONDITION[1],cond));};
  orCond('bcontro_h5hy2oej',type('O'));
  for(const id of ['bcontro_60wsrgf1','bcontro_5dfjokfc'])orCond(id,is('dgkt','O'));
  for(const id of ['bcontro_vcehvwiy','bcontro_6nby9hd2'])orCond(id,is('isKeyT','O'));
  proc('objEq830',['x','xt','y','yt'],[sv('hEq830',n(0)),IF(AND(EQ(a('xt'),a('yt')),EQ(a('x'),a('y'))),[sv('hEq830',n(1)),stop()]),
    c('trySlot830',a('x'),a('xt'),s('__eq__'),a('y'),a('yt')),IF(AND(ok(),type('?')),[c('trySlot830',a('y'),a('yt'),s('__eq__'),a('x'),a('xt'))]),
    IF(AND(ok(),NOT(type('?'))),[c('truth',v('ev'),v('evtype')),sv('hEq830',v('truthv'))])]);
  proc('cachedH830',['x','t'],[IF(AND(eq830(a('t'),'O'),GT(idx('HashId830',a('x')),n(0))),[sv('hValue830',item('HashVal830',idx('HashId830',a('x')))),stop()]),c('hashVal830',a('x'),a('t'))]);
  proc('keyEq830',['x','xt','y','yt'],[IF(NOT(OR(eq830(a('xt'),'O'),eq830(a('yt'),'O'))),[c('dictEqual791',a('x'),a('xt'),a('y'),a('yt')),stop()]),
    c('hSave830'),c('cachedH830',a('x'),a('xt')),addTo('HAcc830',v('hValue830')),IF(ok(),[c('cachedH830',a('y'),a('yt'))]),sv('hEq830',n(0)),
    IF(AND(ok(),EQ(JOIN(s('#'),last('HAcc830')),JOIN(s('#'),v('hValue830')))),[c('objEq830',a('x'),a('xt'),a('y'),a('yt'))]),rm('HAcc830'),c('hRestore830'),sv('dk791eq',v('hEq830'))]);
  enter('dictEqual791 %s %s %s %s',IF(OR(eq830(a('xt'),'O'),eq830(a('yt'),'O')),[c('hSave830'),c('objEq830',a('x'),a('xt'),a('y'),a('yt')),c('hRestore830'),sv('dk791eq',v('hEq830')),stop()]));
  for(const id of ['bproced_di31741u','bproced_daa7yu59','bproced_defte689','bproced_6qp5ohzs','bproced_6w4411kg','bproced_cy3phyi2','bproced_d2n253hz','bproced_dux8i6e5','bproced_dq0u7znt','bproced_d6cwufcl','bproced_4mf6nwof']){
    const b=BL()[id], proto=BL()[BL()[defIdOf('keyEq830 %s %s %s %s')].inputs.custom_block[1]].mutation, prev=JSON.parse(b.mutation.argumentids).map(k=>b.inputs[k]);
    b.inputs=Object.fromEntries(JSON.parse(proto.argumentids).map((k,i)=>[k,prev[i]]));b.mutation={...b.mutation,proccode:proto.proccode,argumentids:proto.argumentids};}
  proc('hashFn830',['lo','hi'],[c('ex232args',a('lo'),a('hi')),IF(NOT(ok()),[stop()]),addTo('HAcc830',v('ev')),c('listlen',v('ev')),
    IF(NOT(is('ev','1')),[rm('HAcc830'),fail('TypeError: hash() takes exactly one argument'),stop()]),c('listitem',last('HAcc830'),n(1)),rm('HAcc830'),c('hashVal830',v('ev'),v('evtype')),
    IF(ok(),[...result(v('hValue830'),'N'),IF(GT(lenOf(v('ev')),n(15)),[sv('evtype',s('J'))])])]);
  before('bproced_iqb63afd',IF(eq830(item('Tok',a('lo')),'hash'),[c('lookup',s('hash')),IF(is('found','0'),[c('nameHas776FnName',s('hash')),IF(NOT(hasMethod()),[
    c('hashFn830',add830(a('lo'),2),add830(a('hi'),-1)),chgV('fnlimit',n(-1)),stop()])])]));
});
