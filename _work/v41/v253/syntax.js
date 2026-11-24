patch('Signature separators and lexical yield scan',()=>{
  // A bare star used to be registered as "*," and treated as *args.
  after('bdataad_8m3em7g43',IF(AND(EQ(v('fplo'),v('fphi')),EQ(item('Tok',v('fplo')),s('*'))),[rep('DefPar',s('last'),s('*'))]));
  guard('bdatase_1911h1e180','bdatase_1911h1e180',NOT(is('z757param','*')));
  guard('bdatach_1914uq98r9','bdatach_1914uq98r9',NOT(is('z757param','/')));
  vars('slash827');before('bdatase_190u1mz4qu',IF(EQ(item('FnPar',ADD(v('fpo'),SUB(v('z757i'),n(1)))),s('/')),[sv('slash827',v('z757i'))]));before('bcontro_190kigaoqi',sv('slash827',n(0)));
  before('bcontro_193443fnkj',IF(AND(GT(v('z757hit'),n(0)),LT(v('z757hit'),v('slash827'))),[IFELSE(is('z757kw','1'),[sv('z757hit',n(0))],[fail('TypeError: positional-only argument passed as keyword'),stop()])]));
  guard('bcontro_8ah8wkiqo','bcontro_8ah8wkiqo',NOT(AND(GT(v('slash827'),n(0)),LT(v('fj'),v('slash827')))));
  const bind='bcontro_8okc9081w';guard(bind,bind,NOT(OR(is('fpm','/'),is('fpm','*'))));
  after('bproced_4qdbh0d1d',IF(AND(OR(EQ(item('Tok',n(1)),s('def')),EQ(item('Tok',n(1)),s('class'))),GT(item('Ends',v('gk')),v('gk'))),[sv('gk',SUB(item('Ends',v('gk')),n(1)))]));
  guard('bdatase_4qjgyjdob','bdatase_4qjgyjdob',NOT(EQ(item('Kind',v('gci')),s('S'))));
});
patch('Delete exception target on leaving the active handler',()=>{
  lists('ExTarget827','GenTarget827');
  for(const [id,name] of [['bdataad_14ntlhttcb','asnm'],['bdataad_14o2nud7uv','t2as']])after(id,addTo('ExTarget827',v(name)));
  after('bdataad_tqbp6tw8',addTo('ExTarget827',s('')));after('bdatade_yn84ngo3',del('ExTarget827',s('last')));
  before('bdatade_14ops6lk8d',IF(AND(EQ(v('cdepth'),last('ExActiveDepth')),NOT(EQ(last('ExTarget827'),s('')))),[c('egDrop764',last('ExTarget827'))]),del('ExTarget827',s('last')));
  before('bdatade_urmla3en',addTo('GenTarget827',last('ExTarget827')),del('ExTarget827',s('last')));
  after('bdataad_vd9f2210',addTo('ExTarget827',last('GenTarget827')),del('GenTarget827',s('last')));
});
patch('Class-body descriptors',()=>{
  lists('ClassStart827','ClassParam827','ClassStack827','PropertyNames827');vars('dec827','fn827','cls827','prop827');
  // Read the decorator preceding this definition, then restore its header tokens.
  before('bproced_4ygnkxoyr',sv('fn827',JOIN(v('ccls'),JOIN(s('.'),item('Tok',n(2))))),sv('dec827',s('')),c('egSave764'),c('tokenize',item('Code',SUB(v('pc'),n(1)))),IF(EQ(item('Tok',n(1)),s('@')),[IF(EQ(item('Tok',n(2)),s('classmethod')),[sv('dec827',s('class'))]),IF(EQ(item('Tok',n(2)),s('property')),[sv('dec827',s('get'))]),IF(AND(EQ(item('Tok',n(3)),s('.')),EQ(item('Tok',n(4)),s('setter'))),[sv('dec827',s('set'))])]),c('egRestore764'),IF(is('dec827','get'),[addTo('PropertyNames827',item('Tok',n(2))),sv('fn827',JOIN(v('ccls'),JOIN(s('.@get:'),item('Tok',n(2)))))]),IF(is('dec827','set'),[sv('fn827',JOIN(v('ccls'),JOIN(s('.@set:'),item('Tok',n(2)))))]),IF(is('dec827','class'),[addTo('ClassStart827',ADD(v('pc'),n(1))),addTo('ClassParam827',item('Tok',n(4)))]));
  replaceStmt('bproced_4ygnkxoyr',c('regdef',v('fn827')));
  // Use ordinary method dispatch for inherited accessors. Only descriptor-bearing names enter this path.
  proc('readProp827',['obj','name'],[c('egSave764'),c('callmeth',a('obj'),JOIN(s('@get:'),a('name')),n(1),n(0)),c('egRestore764')]);
  const get=(id,obj,name,balance)=>before(id,IF(GT(idx('PropertyNames827',name()),n(0)),[c('nameHas776FnName',JOIN(item('InstCls',v(obj)),JOIN(s('.@get:'),name()))),IF(hasMethod(),[c('readProp827',v(obj),name()),...(balance?[chgV('fnlimit',n(-1))]:[]),stop()])]));
  get('bcontro_53mop4r50','iid',()=>item('Tok',ADD(a('lo'),n(2))),true);get('bcontro_7p53qri8m','atid',()=>v('atnm'),true);
  proc('setProp827',['obj','name','val','type'],[c('nameHas776FnName',JOIN(item('InstCls',a('obj')),JOIN(s('.@set:'),a('name')))),IFELSE(hasMethod(),[c('egCallback764',a('obj'),JOIN(s('@set:'),a('name')),a('val'),a('type'))],[fail('AttributeError: property has no setter')])]);
  before('bdatase_4zcgwzdxm',sv('prop827',n(0)),IF(GT(idx('PropertyNames827',item('Tok',n(3))),n(0)),[c('nameHas776FnName',JOIN(item('InstCls',v('iid')),JOIN(s('.@get:'),item('Tok',n(3))))),IF(hasMethod(),[c('setProp827',v('iid'),item('Tok',n(3)),v('cax'),v('cax2')),sv('prop827',n(1))])]));
  guard('bdatase_4zcgwzdxm','bcontro_500qqkld4',is('prop827','0'));
  proc('classRow827',['cls','meth'],[sv('cls827',idx('FnName',JOIN(a('cls'),JOIN(s('.'),a('meth'))))),sv('cls827',idx('ClassStart827',item('FnStart',v('cls827'))))]);
  proc('invokeClass827',['cls','meth','lo','hi'],[addTo('ClassStack827',a('cls')),c('calluser',JOIN(a('cls'),JOIN(s('.'),a('meth'))),a('lo'),a('hi')),del('ClassStack827',s('last'))]);
  before('bcontro_bh4f5gkfa',IF(GT(llen('ClassStart827'),n(0)),[c('classRow827',item('Tok',a('lo')),item('Tok',ADD(a('lo'),n(2)))),IF(GT(v('cls827'),n(0)),[c('invokeClass827',item('Tok',a('lo')),item('Tok',ADD(a('lo'),n(2))),ADD(a('lo'),n(4)),SUB(a('hi'),n(1))),chgV('fnlimit',n(-1)),stop()])]));
  enter('callmeth %s %s %s %s',IF(GT(llen('ClassStart827'),n(0)),[c('classRow827',item('InstCls',a('inst')),a('meth')),IF(GT(v('cls827'),n(0)),[c('invokeClass827',item('InstCls',a('inst')),a('meth'),a('lo'),a('hi')),stop()])]));
  before('bcontro_258pp3d9s',IF(GT(llen('ClassStack827'),n(0)),[sv('cls827',idx('ClassStart827',item('FnStart',v('fi')))),IF(GT(v('cls827'),n(0)),[c('assign',item('ClassParam827',v('cls827')),last('ClassStack827'),s('C'))])]));
  after('bproced_103uzmg7uv',IF(type('C'),[c('attrfind',v('ev'),item('Tok',ADD(a('lo'),n(2)))),IF(GT(v('ev'),n(0)),[sv('cls827',v('ev')),sv('ev',item('IAttrVal',v('cls827'))),sv('evtype',item('IAttrType',v('cls827'))),chgV('fnlimit',n(-1)),stop()]),c('eval',a('lo'),a('lo'))]));
});
patch('Pass a slice object to __getitem__',()=>{
  vars('slI827','slDep827','slSep827','slId827');lists('SliceIds827','SliceFmt827');
  proc('slicePart827',['id','name','lo','hi'],[IFELSE(GT(a('lo'),a('hi')),[...result(s(''),'Z')],[c('eval',a('lo'),a('hi'))]),IF(ok(),[addTo('VStack',v('ev')),addTo('VStack',v('evtype')),c('aset',a('id'),a('name'),v('evtype'),v('ev')),sv('evtype',last('VStack')),del('VStack',s('last')),sv('ev',last('VStack')),del('VStack',s('last')),c('reprval',v('ev'),v('evtype')),rep('SliceFmt827',idx('SliceIds827',a('id')),JOIN(item('SliceFmt827',idx('SliceIds827',a('id'))),v('ev')))])]);
  proc('sliceObj827',['obj','lo','hi','first','second','id'],[addTo('SliceIds827',a('id')),addTo('SliceFmt827',s('slice(')),c('slicePart827',a('id'),s('start'),a('lo'),SUB(a('first'),n(1))),rep('SliceFmt827',idx('SliceIds827',a('id')),JOIN(item('SliceFmt827',idx('SliceIds827',a('id'))),s(', '))),c('slicePart827',a('id'),s('stop'),ADD(a('first'),n(1)),SUB(a('second'),n(1))),rep('SliceFmt827',idx('SliceIds827',a('id')),JOIN(item('SliceFmt827',idx('SliceIds827',a('id'))),s(', '))),c('slicePart827',a('id'),s('step'),ADD(a('second'),n(1)),a('hi')),rep('SliceFmt827',idx('SliceIds827',a('id')),JOIN(item('SliceFmt827',idx('SliceIds827',a('id'))),s(')'))),IF(ok(),[c('egCallback764',a('obj'),s('__getitem__'),a('id'),s('O'))])]);
  prependStack('bcontro_r4y113208','SUBSTACK',chain([sv('slI827',ADD(v('oisl'),n(1))),sv('slDep827',n(0)),sv('slSep827',ADD(v('ighi'),n(1))),REPEATU(GT(v('slI827'),v('ighi')),[IF(NOT(EQ(item('Kind',v('slI827')),s('S'))),[...['(', '[','{'].map(t=>IF(EQ(item('Tok',v('slI827')),s(t)),[chgV('slDep827',n(1))])),...[')',']','}'].map(t=>IF(EQ(item('Tok',v('slI827')),s(t)),[chgV('slDep827',n(-1))])),IF(AND(is('slDep827','0'),EQ(item('Tok',v('slI827')),s(':'))),[sv('slSep827',v('slI827'))])]),chgV('slI827',n(1))]),addTo('InstCls',s('slice')),c('sliceObj827',v('igev'),v('iglo'),v('ighi'),v('oisl'),v('slSep827'),llen('InstCls')),stop()]));
  for(const p of ['strval','reprval'])enter(p+' %s %s',IF(AND(EQ(a('vt'),s('O')),GT(idx('SliceIds827',a('vv')),n(0))),[...result(item('SliceFmt827',idx('SliceIds827',a('vv'))),'S'),stop()]));
});
patch('Comprehension-local late binding',()=>{
  lists('CompFrame827','CompFn827','CompFnScope827','CompScope827','CompVar827','CompVal827','CompType827');vars('compSerial827','compI827','compR827','compF827');after('bdatade_vej52uqnt',sv('compSerial827',n(0)));
  // Each comprehension invocation has its own cells. Register only iteration targets, never globals.
  for(const id of ['bproced_b1jqaqu0v','bproced_b3nb5j6jf']){before(id,chgV('compSerial827',n(1)),addTo('CompFrame827',v('compSerial827')));after(id,del('CompFrame827',s('last')));}
  proc('compWrite827',['nm','val','type'],[sv('compR827',n(0)),sv('compI827',llen('CompVar827')),REPEATU(OR(LT(v('compI827'),n(1)),GT(v('compR827'),n(0))),[IF(AND(EQ(item('CompScope827',v('compI827')),last('CompFrame827')),EQ(item('CompVar827',v('compI827')),a('nm'))),[sv('compR827',v('compI827'))]),chgV('compI827',n(-1))]),IFELSE(GT(v('compR827'),n(0)),[rep('CompVal827',v('compR827'),a('val')),rep('CompType827',v('compR827'),a('type'))],[addTo('CompScope827',last('CompFrame827')),addTo('CompVar827',a('nm')),addTo('CompVal827',a('val')),addTo('CompType827',a('type'))])]);
  for(const id of ['bproced_mdnwbsxlp','bproced_mdfnohdlk','bproced_md71iyi2p'])before(id,IF(GT(llen('CompFrame827'),n(0)),[c('compWrite827',item('Tok',ADD(v('cqq'),n(1))),v('cvv'),v('cvt'))]));
  after('bproced_ve3a9im3',IF(GT(llen('CompFrame827'),n(0)),[addTo('CompFn827',llen('FnName')),addTo('CompFnScope827',last('CompFrame827'))]));
  before('bproced_256ng8l2e',sv('compF827',idx('CompFn827',v('fi'))),IF(GT(v('compF827'),n(0)),[sv('compI827',n(1)),REPEAT(llen('CompScope827'),[IF(EQ(item('CompScope827',v('compI827')),item('CompFnScope827',v('compF827'))),[sv('compR827',n(0)),sv('slI827',n(1)),REPEAT(item('FnPN',v('fi')),[IF(EQ(item('FnPar',ADD(item('FnPO',v('fi')),SUB(v('slI827'),n(1)))),item('CompVar827',v('compI827'))),[sv('compR827',n(1))]),chgV('slI827',n(1))]),IF(is('compR827','0'),[c('assign',item('CompVar827',v('compI827')),item('CompVal827',v('compI827')),item('CompType827',v('compI827')))])]),chgV('compI827',n(1))])]));
});
patch('Unicode literals and Latin case conversion',()=>{
  // Append costumes; never renumber printable ASCII. Scratch string equality folds case,
  // so use the VM's exact costume-name lookup for character-to-table indexing.
  const crypto=require('node:crypto'),interp=T(IT),renderer=T('TextRenderer'),first=interp.costumes.length;
  const chars=Array.from({length:0x250-0xa0},(_,i)=>String.fromCodePoint(i+0xa0)).concat('ẞ');
  B.addList(IT,'Upper827',chars.map(ch=>ch.toUpperCase()));B.addList(IT,'Lower827',chars.map(ch=>ch.toLowerCase()));
  for(const ch of chars){const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11"><text x="0" y="8.3" font-family="monospace" font-size="9" fill="#252525">${ch}</text></svg>`);const hash=crypto.createHash('md5').update(svg).digest('hex'),md5ext=hash+'.svg';entries.push({name:md5ext,data:svg});for(const [target,prefix] of [[interp,'_'],[renderer,'']])target.costumes.push({...target.costumes[0],assetId:hash,md5ext,name:prefix+ch});}
  vars('ucQuote827','ucEsc827','ucChar827','ucIdx827');
  const sw=x=>I('looks_switchcostumeto',{inputs:{COSTUME:B.REP(x,[10,''])}}),cost=()=>I('looks_costumenumbername',{fields:{NUMBER_NAME:['number',null]}});
  before(';Bf5!gFax1j]v4{COV3T',sv('ucQuote827',s('')),sv('ucEsc827',n(0)));
  before('e-0+j[oO4q]rhlIP.IVs',sv('ucChar827',letterOf(v('ci'),a('source'))),IFELSE(is('ucQuote827',''),[IF(is('ucChar827','#'),[stop()]),IF(OR(is('ucChar827',"'"),is('ucChar827','"')),[sv('ucQuote827',v('ucChar827'))])],[IFELSE(is('ucEsc827','1'),[sv('ucEsc827',n(0))],[IF(is('ucChar827','\\'),[sv('ucEsc827',n(1))]),IF(EQ(v('ucChar827'),v('ucQuote827')),[sv('ucQuote827',s(''))])])]));
  guard('.,V0^x4c,[WO+?Uy+]-|','.,V0^x4c,[WO+?Uy+]-|',is('ucQuote827',''));
  before('bdatase_27brw8p4x',sw(n(1)),sw(JOIN(s('_'),v('smc'))),sv('ucIdx827',SUB(cost(),n(first))),IF(GT(v('ucIdx827'),n(0)),[IFELSE(EQ(a('mode'),s('upper')),[sv('smrep',item('Upper827',v('ucIdx827')))],[sv('smrep',item('Lower827',v('ucIdx827')))])]));
});
