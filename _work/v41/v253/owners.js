patch('Mutable member references survive container transport',()=>{
  lists('UnpackRef827','RecvRef827','ExportKeys827','AttrSlot827','AttrRef827');vars('itemRef827','valueRef827','packName827','attrRow827','attrIdx827');
  const mutable=()=>OR(type('D'),type('L'));
  proc('bindRef827',['name','id'],[c('refFind826',a('name'),llen('FrGen')),IFELSE(GT(v('rRow826'),n(0)),[rep('RefIds826',v('rRow826'),a('id'))],[addTo('RefKeys826',v('rKey826')),addTo('RefIds826',a('id'))]),IF(EQ(idx('ExportKeys827',a('name')),n(0)),[addTo('ExportKeys827',a('name'))])]);
  // & and ! are private record tags, decoded by listitem before any Python operation.
  proc('packRef827',['lo','hi','data','kind'],[sv('packName827',s('')),IF(AND(EQ(a('lo'),a('hi')),EQ(item('Kind',a('lo')),s('I'))),[sv('packName827',item('Tok',a('lo')))]),c('refGet826',v('packName827'),a('data'),llen('FrGen')),sv('ev',v('rId826')),IFELSE(EQ(a('kind'),s('D')),[sv('evtype',s('&'))],[sv('evtype',s('!'))])]);
  const stk=off=>item('VStack',SUB(llen('VStack'),n(off)));
  for(const [anchor,lo,hi] of [['bproced_4e3mlw985',()=>stk(2),()=>SUB(stk(1),n(1))],['bproced_4e44g52zf',()=>stk(2),()=>a('hi')],['bproced_4dqkxrdwy',()=>v('lplo'),()=>SUB(item('LComm',v('lpi')),n(1))],['bproced_4drbli0xd',()=>v('lplo'),()=>a('hi')]])before(anchor,IF(mutable(),[c('packRef827',lo(),hi(),v('ev'),v('evtype'))]));
  enter('listitem %s %s',sv('itemRef827',n(0)));after('bdatase_13b5c0inj',IF(OR(type('&'),type('!')),[sv('itemRef827',v('ev')),IFELSE(type('&'),[sv('evtype',s('D'))],[sv('evtype',s('L'))]),sv('ev',item('RefData826',v('itemRef827')))]));
  after('bdatade_6yibmyihs',clearL('UnpackRef827'));before('bcontro_6yqx949by',sv('itemRef827',n(0)));before('bdataad_6yrdpwgvc',addTo('UnpackRef827',v('itemRef827')));after('bproced_6z334gale',IF(GT(item('UnpackRef827',v('aum')),n(0)),[c('bindRef827',item('AName',v('aum')),item('UnpackRef827',v('aum')))]));
  // Preserve an exported component's owner on direct indexing assignments, not only unpack.
  before('oyZ^4fnxYCtDOSCp9}1b',sv('valueRef827',n(0)));before('bproced_4vxfh6doe',addTo('VStack',v('valueRef827')));
  after('RXa4zA)5}o;Iiw)K%3/q',sv('valueRef827',last('VStack')),del('VStack',s('last')),IF(AND(mutable(),AND(GT(v('valueRef827'),n(0)),EQ(item('Tok',v('count')),s(']')))),[c('bindRef827',v('name'),v('valueRef827'))]));
  // A resumed closure can write its original cell after the caller's Values snapshot is restored.
  // Read exported mutable aliases from the same owner slot, not that old snapshot.
  after('cx+0Wi*T0p.oTv?CeJ+D',IF(AND(mutable(),GT(idx('ExportKeys827',item('Names',v('found'))),n(0))),[c('refFind826',item('Names',v('found')),llen('FrGen')),IF(GT(v('rId826'),n(0)),[sv('ev',item('RefData826',v('rId826')))])]));
  // Attribute identity is tied to (object id, attribute name), not the __recv scratch temporary.
  proc('attrRef827',['row','data'],[sv('attrIdx827',idx('AttrSlot827',a('row'))),IF(EQ(v('attrIdx827'),n(0)),[addTo('AttrSlot827',a('row')),addTo('RefData826',a('data')),addTo('AttrRef827',llen('RefData826')),sv('attrIdx827',llen('AttrRef827'))]),sv('valueRef827',item('AttrRef827',v('attrIdx827')))]);
  for(const id of ['bdatase_53lk229gz','bdatase_7b4mhllvv','bdatase_7a8gtir26','bdatase_7ox49y2mk','bdatase_7p2w3bir6']){let tail=id;while(BL()[tail].fields?.VARIABLE?.[0]!=='evtype')tail=BL()[tail].next;after(tail,IF(mutable(),[c('attrRef827',v('cX'),v('ev'))]));}
  before('bproced_hwqcislu1',sv('valueRef827',n(0)));after('bproced_15njik8c0',sv('valueRef827',v('itemRef827')));
  after('bproced_hwqcislu1',addTo('RecvRef827',v('valueRef827')));
  for(const id of ['bproced_73xfcnns','bproced_79gunsmm','bproced_7fyuwht3'])after(id,IF(AND(EQ(a('nm'),s('__recv')),GT(last('RecvRef827'),n(0))),[sv('rId826',last('RecvRef827'))]));
  before('bdatase_q2qb308pu',IF(GT(last('RecvRef827'),n(0)),[rep('RefData826',last('RecvRef827'),item('Values',v('found')))]));
  guard('bproced_hy3nm496x','bproced_hy3nm496x',NOT(AND(GT(last('RecvRef827'),n(0)),EQ(item('Tok',SUB(a('mdot'),n(1))),s(']')))));
  after('bcontro_hycy2wunl',del('RecvRef827',s('last')));
  after('bdatare_hsnxqoqcf',sv('attrIdx827',idx('AttrSlot827',v('cX'))),IF(GT(v('attrIdx827'),n(0)),[IFELSE(is('p8mut','1'),[rep('RefData826',item('AttrRef827',v('attrIdx827')),a('vv'))],[del('AttrSlot827',v('attrIdx827')),del('AttrRef827',v('attrIdx827'))])]));
});
patch('Refresh exported aliases in print snapshots',()=>{
  for(const id of ['bdatase_suo2wwl4a','bdatase_sxcq40w7j']){const nm=()=>item('SegN',ADD(last('PrBaS'),v('pi')));after(id,IF(AND(OR(type('D'),type('L')),GT(idx('ExportKeys827',nm()),n(0))),[c('refFind826',nm(),llen('FrGen')),IF(GT(v('rId826'),n(0)),[sv('ev',item('RefData826',v('rId826')))])]));}
});
patch('Compare nested mutable owner IDs for identity, not equality',()=>{
  // The RHS evaluation is recursive: keep the LHS owner on the interpreter stack.
  lists('Identity827');const ident=()=>OR(EQ(a('op'),s('is')),EQ(a('op'),s('isnot')));
  before('k+6eCwci:M;M64tD_umG',IF(ident(),[addTo('Identity827',v('valueRef827')),sv('valueRef827',n(0))]));
  after('k+6eCwci:M;M64tD_umG',IF(ident(),[sv('itemRef827',last('Identity827')),del('Identity827',s('last')),IF(AND(ok(),AND(GT(v('itemRef827'),n(0)),GT(v('valueRef827'),n(0)))),[...result(EQ(EQ(v('itemRef827'),v('valueRef827')),EQ(a('op'),s('is'))),'B'),stop()])]));
  // No index provenance from a previous atom may carry into this evaluation.
  enter('atom %s',sv('valueRef827',n(0)));
});
