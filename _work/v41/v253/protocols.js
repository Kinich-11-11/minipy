patch('Object and builtin protocols',()=>{
  proc('checkLen827',[],[IF(ok(),[IFELSE(OR(type('B'),AND(type('N'),EQ(JOIN(s('i'),v('ev')),JOIN(s('i'),FLOOR(v('ev')))))),[IF(LT(v('ev'),n(0)),[fail('ValueError: __len__() should return >= 0')]),sv('evtype',s('N'))],[fail('TypeError: __len__ returned a non-integer')])])]);
  enter('truth %s %s',IF(EQ(a('vt'),s('O')),[method(a('vv'),'__bool__'),IF(hasMethod(),[...call0(a('vv'),'__bool__'),IF(AND(ok(),NOT(type('B'))),[fail('TypeError: __bool__ should return bool')]),sv('truthv',v('ev')),stop()]),method(a('vv'),'__len__'),IF(hasMethod(),[...call0(a('vv'),'__len__'),c('checkLen827'),sv('truthv',GT(v('ev'),n(0))),stop()])]));
  for(const id of ['bproced_npik7nq3e','bwr_p024whp4y'])after(id,c('checkLen827'));
  // Insert after argument evaluation and user-defined dispatch (not a reserved-name parser shortcut).
  for(const id of ['bcontro_naxafvvkv','bwr_om63gsx1v'])before(id,IF(EQ(a('fn'),s('callable')),[IFELSE(type('O'),[method(v('ev'),'__call__'),sv('ev',v('cs776found'))],[sv('ev',OR(OR(type('F'),type('M')),OR(OR(type('C'),type('P')),type('R'))))]),sv('evtype',s('B')),sv('evK',s('')),sv('pending',n(1)),stop()]));
  for(const [id,obj,name,balance] of [['bproced_dh1m1v1hl','iid',()=>item('Tok',ADD(a('lo'),n(2))),false],['bproced_dgiciu2ct','atid',()=>v('atnm'),true]])before(id,method(v(obj),'__getattr__'),IF(hasMethod(),[c('egCallback764',v(obj),s('__getattr__'),name(),s('S')),...(balance?[chgV('fnlimit',n(-1))]:[]),stop()]));
  before('bcontro_wyycd1du0',IF(AND(type('O'),NOT(EQ(a('lefttype'),s('O')))),['==','+'].map((op,i)=>IF(EQ(a('op'),s(op)),[method(v('ev'),['__eq__','__radd__'][i]),IF(hasMethod(),[c('egCallback764',v('ev'),s(['__eq__','__radd__'][i]),a('leftval'),a('lefttype')),stop()])]))));
  guard('bcontro_bw0o87d0','bcontro_bw0o87d0',NOT(AND(EQ(a('meth'),s('pop')),EQ(lenOf(a('rec')),n(0)))));
});
patch('Modular inverse, base zero and container sum',()=>{
  vars('modA827','modB827','modX827','modY827','modQ827','modT827','modE827','modR827','base827','zero827');
  // Extended Euclid, then modular exponentiation by squaring. Never expand base**abs(exp).
  const big=(op,x,y)=>c('bgops',s(op),s('J'),x,s('J'),y);
  proc('invPow827',['base','exp','mod'],[sv('modB827',a('mod')),IF(EQ(letterOf(n(1),a('mod')),s('-')),[c('substr',a('mod'),n(2),lenOf(a('mod'))),sv('modB827',v('ev'))]),big('%',a('base'),v('modB827')),sv('modA827',v('ev')),sv('modX827',n(1)),sv('modY827',n(0)),
    REPEATU(is('modB827','0'),[c('bgdv',v('modA827'),v('modB827')),sv('modQ827',v('bgq')),sv('modT827',v('bgr')),sv('modA827',v('modB827')),sv('modB827',v('modT827')),big('*',v('modQ827'),v('modY827')),big('-',v('modX827'),v('ev')),sv('modX827',v('modY827')),sv('modY827',v('ev'))]),IF(NOT(is('modA827','1')),[fail('ValueError: base is not invertible for the given modulus'),stop()]),
    c('substr',a('exp'),n(2),lenOf(a('exp'))),sv('modE827',v('ev')),big('%',n(1),a('mod')),sv('modR827',v('ev')),big('%',v('modX827'),a('mod')),sv('modX827',v('ev')),
    REPEATU(is('modE827','0'),[c('bgdv',v('modE827'),n(2)),sv('modE827',v('bgq')),IF(is('bgr','1'),[big('*',v('modR827'),v('modX827')),big('%',v('ev'),a('mod')),sv('modR827',v('ev'))]),big('*',v('modX827'),v('modX827')),big('%',v('ev'),a('mod')),sv('modX827',v('ev'))]),...result(v('modR827'),'N'),IF(GT(lenOf(v('ev')),n(15)),[sv('evtype',s('J'))])]);
  const integer=(value,t)=>AND(OR(EQ(t,s('N')),EQ(t,s('J'))),NOT(I('operator_contains',{inputs:{STRING1:B.REP(value,[10,'']),STRING2:B.REP(s('.'),[10,''])}})));
  before('bcontro_n6q8osk30',IF(AND(ok(),LT(v('pwv2'),n(0))),[IF(NOT(AND(integer(v('pwv1'),v('pwt1')),AND(integer(v('pwv2'),v('pwt2')),integer(v('ev'),v('evtype'))))),[fail('TypeError: three-argument pow requires integers'),stop()]),IF(is('ev','0'),[fail('ValueError: pow() 3rd argument cannot be 0'),stop()]),c('invPow827',v('pwv1'),v('pwv2'),v('ev')),sv('pending',n(1)),stop()]));
  vars('biEnd827','biText827','biChr827','biSign827','biPrev827','biDigit827','biStart827');
  const white=x=>I('operator_contains',{inputs:{STRING1:B.REP(s(' \t\n\r\v\f'),[10,'']),STRING2:B.REP(x,[10,''])}});
  const bad=()=>[fail('ValueError: invalid literal for int() with base 0'),stop()];
  proc('autoBase827',['raw'],[sv('bi',n(1)),sv('biEnd827',lenOf(a('raw'))),REPEATU(OR(GT(v('bi'),v('biEnd827')),NOT(white(letterOf(v('bi'),a('raw'))))),[chgV('bi',n(1))]),REPEATU(OR(GT(v('bi'),v('biEnd827')),NOT(white(letterOf(v('biEnd827'),a('raw'))))),[chgV('biEnd827',n(-1))]),sv('biSign827',s('')),IF(OR(EQ(letterOf(v('bi'),a('raw')),s('-')),EQ(letterOf(v('bi'),a('raw')),s('+'))),[sv('biSign827',letterOf(v('bi'),a('raw'))),chgV('bi',n(1))]),sv('base827',n(10)),sv('zero827',n(0)),IF(EQ(letterOf(v('bi'),a('raw')),s('0')),[sv('zero827',n(1)),...Object.entries({b:2,o:8,x:16}).map(([ch,radix])=>IF(EQ(letterOf(ADD(v('bi'),n(1)),a('raw')),s(ch)),[sv('base827',n(radix))]))]),IF(NOT(is('base827','10')),[chgV('bi',n(2)),sv('zero827',n(0))]),sv('biPrev827',n(0)),sv('biText827',v('biSign827')),sv('biDigit827',n(0)),REPEATU(GT(v('bi'),v('biEnd827')),[sv('biChr827',letterOf(v('bi'),a('raw'))),IFELSE(is('biChr827','_'),[IF(OR(is('biPrev827','1'),AND(is('biDigit827','0'),is('base827','10'))),bad()),sv('biPrev827',n(1))],[sv('biText827',JOIN(v('biText827'),v('biChr827'))),sv('biDigit827',n(1)),sv('biPrev827',n(0))]),chgV('bi',n(1))]),IF(OR(is('biDigit827','0'),is('biPrev827','1')),bad()),c('basenum',v('biText827'),v('base827')),IF(AND(is('zero827','1'),NOT(is('ev','0'))),bad())]);
  enter('basenum %s %s',IF(EQ(a('b'),n(0)),[c('autoBase827',a('s')),stop()]));
  vars('sumRecord827','sumI827','sumN827','sumAcc827','sumType827');
  proc('seqSum827',['start','kind','lo','hi'],[c('eval',a('lo'),a('hi')),IF(NOT(ok()),[stop()]),IF(type('G'),[c('gconv')]),IF(type('Y'),[c('drain827',v('ev'))]),sv('sumRecord827',v('ev')),sv('sumAcc827',a('start')),sv('sumType827',a('kind')),c('listlen',v('sumRecord827')),sv('sumN827',v('ev')),sv('sumI827',n(1)),REPEAT(v('sumN827'),[c('listitem',v('sumRecord827'),v('sumI827')),IF(NOT(EQ(v('evtype'),v('sumType827'))),[fail('TypeError: incompatible sequence in sum()'),stop()]),sv('sumAcc827',JOIN(v('sumAcc827'),v('ev'))),chgV('sumI827',n(1))]),sv('ev',v('sumAcc827')),sv('evtype',a('kind')),sv('evK',s(''))]);
  before('bproced_i06a89wfj',addTo('VStack',v('tqcpz')));after('bproced_i06a89wfj',sv('tqcpz',last('VStack')),del('VStack',s('last')));
  before('bcontro_i0mcas3mf',IF(OR(type('L'),type('T')),[c('seqSum827',v('ev'),v('evtype'),ADD(a('lo'),n(2)),SUB(v('tqcpz'),n(1))),chgV('fnlimit',n(-1)),stop()]));
});
patch('Recognize builtin function values without treating arbitrary strings as callable',()=>{
  // In this VM builtins are represented by display strings. Preserve provenance instead of
  // letting a string literal such as "<built-in function len>" impersonate the builtin.
  vars('builtin827','builtinRow827');lists('BuiltinKey827');
  before('bcontro_pjw9s207g',IF(is('ev','callable'),[...result(s('<built-in function callable>'),'S'),sv('builtin827',n(1)),stop()]));
  for(const id of inDef('atom %s')){const b=BL()[id];if(b.opcode!=='data_setvariableto'||b.fields.VARIABLE[0]!=='ev')continue;const expr=b.inputs.VALUE?.[1];if(typeof expr!=='string')continue;
    function hasMarker(k){const x=BL()[k];return x&&Object.values(x.inputs||{}).some(d=>Array.isArray(d[1])?['<built-in function ',"<class '"].includes(d[1][1]):hasMarker(d[1]));}if(hasMarker(expr))after(id,sv('builtin827',n(1)));}
  enter('atom %s',sv('builtin827',n(0)));
  before('bproced_4vxfh6doe',sv('builtinRow827',idx('BuiltinKey827',v('name'))),IF(GT(v('builtinRow827'),n(0)),[del('BuiltinKey827',v('builtinRow827'))]),IF(AND(type('S'),AND(is('builtin827','1'),EQ(v('count'),n(3)))),[addTo('BuiltinKey827',v('name'))]));
  after('cx+0Wi*T0p.oTv?CeJ+D',IF(AND(type('S'),GT(idx('BuiltinKey827',item('Names',v('found'))),n(0))),[sv('builtin827',n(1))]));
  // The unary builtin dispatcher has already evaluated its argument.
  for(const id of ['bcontro_naxafvvkv','bwr_om63gsx1v']){let p=predecessorOf(id);while(p){const t=BL()[p];if(t.opcode==='control_if'&&JSON.stringify(BL()[t.inputs.CONDITION[1]]).includes('callable')){prependStack(p,'SUBSTACK',IF(AND(type('S'),is('builtin827','1')),[...result(n(1),'B'),sv('pending',n(1)),stop()]));break;}p=predecessorOf(p);}}
});
patch('Validate callable arity before unary argument evaluation',()=>{
  for(const p of ['callfn %s %s %s','callfnW %s %s %s'])enter(p,IF(EQ(a('fn'),s('callable')),[c('nameHas776FnName',a('fn')),IF(NOT(hasMethod()),[c('lookup',a('fn')),IF(EQ(v('found'),n(0)),[c('hascomma',a('lo'),a('hi')),IF(OR(GT(a('lo'),a('hi')),AND(is('tqhcm','1'),LT(v('tqcpz'),a('hi')))),[IF(NOT(GT(a('lo'),a('hi'))),[c('ex232args',a('lo'),a('hi'))]),IF(ok(),[fail('TypeError: callable() takes exactly one argument')]),stop()])])])]));
});
patch('Callable zero and multiple argument fast paths',()=>{
  before('bproced_dl7j6302h',IF(is('x9fn','callable'),[fail('TypeError: callable() takes exactly one argument'),sv('x9go',n(1)),stop()]));
  before('bcontro_87z5rp37w',IF(EQ(item('Tok',a('lo')),s('callable')),[c('nameHas776FnName',s('callable')),IF(NOT(hasMethod()),[c('lookup',s('callable')),IF(is('found','0'),[c('hascomma',ADD(a('lo'),n(2)),SUB(a('hi'),n(1))),IF(AND(is('tqhcm','1'),LT(v('tqcpz'),SUB(a('hi'),n(1)))),[c('ex232args',ADD(a('lo'),n(2)),SUB(a('hi'),n(1))),IF(ok(),[fail('TypeError: callable() takes exactly one argument')]),chgV('fnlimit',n(-1)),stop()])])])]));
});
