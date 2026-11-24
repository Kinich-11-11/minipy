// The bounds are valid Unicode scalars, so they survive Scratch project import.
// Even the last lone high surrogate (DBFF) sorts before the pair DBFF DFFF.
const uHigh829 = x => AND(GT(x(), s('\uD7FF')), LT(x(), s('\u{10FFFF}')));
const uLow829 = x => AND(GT(x(), s('\u{10FFFF}')), LT(x(), s('\uE000')));
patch('Python string positions are code points, not UTF-16 units', () => {
  const z = () => n(0), one = () => n(1), inc = name => chgV(name, one());
  const plus = (x, k) => ADD(x, n(k));
  const eqt = (x, t) => EQ(x(), s(t));
  const contains = (hay, needle) => I('operator_contains', {inputs: {STRING1: B.REP(hay, [10,'']), STRING2: B.REP(needle, [10,''])}});
  vars('uPos829','uChar829','uLen829','uDepth829','uCol829','uCol2829','uTok829',
       'uStart829','uEnd829','uOut829','uIndex829');
  lists('UChars829');
  proc('uScan829', ['text','collect'], [
    IF(EQ(a('collect'), one()), [clearL('UChars829')]), sv('uLen829', lenOf(a('text'))),
    IF(AND(EQ(a('collect'), z()), LT(v('uLen829'), n(2))), [stop()]),
    sv('uPos829', one()), REPEATU(GT(v('uPos829'), lenOf(a('text'))), [
      sv('uChar829', letterOf(v('uPos829'), a('text'))),
      IF(uHigh829(() => v('uChar829')), [IF(uLow829(() => letterOf(plus(v('uPos829'),1), a('text'))), [
        inc('uPos829'), chgV('uLen829', n(-1)),
        IF(EQ(a('collect'), one()), [sv('uChar829', JOIN(v('uChar829'), letterOf(v('uPos829'), a('text'))))])
      ])]),
      IF(EQ(a('collect'), one()), [addTo('UChars829', v('uChar829'))]), inc('uPos829')
    ])
  ]);
  for (const id of ['bdatase_6om3kchup','bwr_p0jb39vo3']) {
    before(id, c('uScan829', v('ev'), z())); BL()[id].inputs.VALUE = B.REP(v('uLen829'), [10,'']);
  }
  // charsplit feeds list(), tuple(), iter(), etc. Only replace the unit reader;
  // retain the existing escaping of internal list separators and element tags.
  after('bdatase_dmseu14u9', c('uScan829', v('gan'), one()));
  replaceStmt('bproced_dmymwzsuh', c('lesc', item('UChars829', v('gci'))));
  BL()['bcontro_dn3b5e8eh'].inputs.CONDITION = [2, GT(v('gci'), llen('UChars829'))];

  // Route materialization and iteration through the same splitting routine rather
  // than the old per-code-unit fast paths. The loop stores its own encoded list.
  for (const id of ['bcontro_4sqxjxm0q','bwr_ors5pm0fh']) setStack(id,'SUBSTACK',[c('charsplit')]);
  // Preserve the old string fast paths for BMP-only text (no encoded list needed).
  proc('uIterText829',[],[c('uScan829',v('ev'),z()),
    IF(LT(v('uLen829'),lenOf(v('ev'))),[c('charsplit')])]);
  for (const id of [
    'bcontro_fnz0w8al', 'bdatase_awpixhnqp', // for and list comprehensions
    'bdatase_vwcpadd6w', 'bdatase_vkkic16zn', // streaming generator predicates
    'bdatase_gf9h7emgf','bdatase_gajn6iuy8', // print(*s), f(*s)
    'bdatase_jzrhyv57d','bdatase_6y0tdn77j'  // assignment unpacking
  ]) before(id,IF(type('S'),[c('uIterText829')]));
  // A suspended generator owns its UTF-16 cursor. Consume a second unit only for
  // a valid pair, without eagerly materializing the iterable or sharing a cursor.
  const advancePair = (id,values,indices,cursor,next) => {
    const follow = () => letterOf(plus(item(indices,cursor()),next),item(values,cursor()));
    after(id,IF(uHigh829(()=>v('ev')),[IF(uLow829(follow),[
      sv('ev',JOIN(v('ev'),follow())), rep(indices,cursor(),plus(item(indices,cursor()),1))]) ]));
  };
  advancePair('bdatase_1qw646aca','GXFinV','GXFinI',()=>a('i'),1); // generator expression
  advancePair('bdatase_vchwvt4uj','GHyfV','GHyfP',()=>v('gmy'),2); // yield from

  const whole = x => AND(
    NOT(contains(x(),s('.'))),
    AND(NOT(contains(x(),s('e'))), contains(s('0123456789'),letterOf(lenOf(x()),x())))
  );
  const integer = (t,x) => OR(eqt(t,'B'), OR(eqt(t,'J'), AND(eqt(t,'N'),whole(x))));
  const optionalInt = (t,x) => OR(eqt(t,'Z'), integer(t,x));
  const bound = (target, value, kind, isStart) => [
    IFELSE(EQ(a(kind),s('Z')), [IFELSE(LT(a('step'),z()), [sv(target,isStart ? plus(v('uLen829'),-1) : n(-1))],
      [sv(target,isStart ? z() : v('uLen829'))])], [
      sv(target, a(value)), IF(LT(v(target),z()), [sv(target,ADD(v(target),v('uLen829')))]),
      IFELSE(LT(a('step'),z()), [IF(LT(v(target),z()),[sv(target,n(-1))]),
        IF(NOT(LT(v(target),v('uLen829'))),[sv(target,plus(v('uLen829'),-1))])], [
        IF(LT(v(target),z()),[sv(target,z())]), IF(GT(v(target),v('uLen829')),[sv(target,v('uLen829'))])])
    ])];
  proc('uSliceRun829',['text','start','st','end','et','step'],[
    c('uScan829',a('text'),one()), ...bound('uStart829','start','st',true), ...bound('uEnd829','end','et',false),
    sv('uPos829',v('uStart829')), sv('uOut829',s('')),
    REPEATU(OR(AND(GT(a('step'),z()),NOT(LT(v('uPos829'),v('uEnd829')))),
               AND(LT(a('step'),z()),NOT(GT(v('uPos829'),v('uEnd829'))))), [
      sv('uOut829',JOIN(v('uOut829'),item('UChars829',plus(v('uPos829'),1)))), chgV('uPos829',a('step'))]),
    ...result(v('uOut829'),'S')]);
  proc('uBound829',['lo','hi'],[IFELSE(GT(a('lo'),a('hi')),result(s(''),'Z'),[c('eval',a('lo'),a('hi'))])]);
  const badSlice = () => fail('TypeError: slice indices must be integers or None');
  proc('uStep829',['text','c2','hi','start','st','end','et'],[
    c('uBound829',plus(a('c2'),1),a('hi')), IF(NOT(ok()),[stop()]),
    IF(type('Z'),result(one(),'N')), IF(NOT(integer(()=>v('evtype'),()=>v('ev'))),[badSlice(),stop()]),
    IF(is('ev','0'),[fail('ValueError: slice step cannot be zero'),stop()]),
    IF(NOT(AND(optionalInt(()=>a('st'),()=>a('start')),optionalInt(()=>a('et'),()=>a('end')))),[badSlice(),stop()]),
    c('uSliceRun829',a('text'),a('start'),a('st'),a('end'),a('et'),v('ev'))]);
  proc('uEnd829',['text','c1','c2','hi','start','st'],[
    c('uBound829',plus(a('c1'),1),plus(a('c2'),-1)), IF(ok(),[
      c('uStep829',a('text'),a('c2'),a('hi'),a('start'),a('st'),v('ev'),v('evtype'))])]);
  proc('uSlice829',['text','lo','hi','c1','c2'],[
    c('uBound829',a('lo'),plus(a('c1'),-1)), IF(ok(),[
      c('uEnd829',a('text'),a('c1'),a('c2'),a('hi'),v('ev'),v('evtype'))])]);
  proc('uAt829',['text','lo','hi'],[
    c('eval',a('lo'),a('hi')), IF(NOT(ok()),[stop()]),
    IF(NOT(integer(()=>v('evtype'),()=>v('ev'))),[fail('TypeError: string indices must be integers'),stop()]),
    sv('uIndex829',v('ev')), c('uScan829',a('text'),one()),
    IF(LT(v('uIndex829'),z()),[sv('uIndex829',ADD(v('uIndex829'),v('uLen829')))]),
    IF(OR(LT(v('uIndex829'),z()),NOT(LT(v('uIndex829'),v('uLen829')))),[fail('IndexError: string index out of range'),stop()]),
    ...result(item('UChars829',plus(v('uIndex829'),1)),'S')]);
  // Freeze text, separators and evaluated bounds in procedure frames. Nested indexes
  // and callback evaluation cannot overwrite a partially materialized outer slice.
  proc('uSub829',['text','lo','hi'],[
    sv('uDepth829',z()),sv('uCol829',z()),sv('uCol2829',plus(a('hi'),1)),sv('uPos829',a('lo')),
    REPEATU(GT(v('uPos829'),a('hi')),[IF(NOT(EQ(item('Kind',v('uPos829')),s('S'))),[
      sv('uTok829',item('Tok',v('uPos829'))),
      IF(OR(is('uTok829','('),OR(is('uTok829','['),is('uTok829','{'))),[inc('uDepth829')]),
      IF(OR(is('uTok829',')'),OR(is('uTok829',']'),is('uTok829','}'))),[chgV('uDepth829',n(-1))]),
      IF(AND(is('uTok829',':'),is('uDepth829','0')),[IFELSE(is('uCol829','0'),[sv('uCol829',v('uPos829'))],
        [IF(NOT(GT(v('uCol2829'),a('hi'))),[fail('SyntaxError: too many slice separators'),stop()]),sv('uCol2829',v('uPos829'))])])]),inc('uPos829')]),
    IFELSE(is('uCol829','0'),[c('uAt829',a('text'),a('lo'),a('hi'))],
      [c('uSlice829',a('text'),a('lo'),a('hi'),v('uCol829'),v('uCol2829'))])]);
  for (const id of ['bcontro_4kl7nnf4e','bcontro_4kqr9yaae']) {
    const input = BL()[id].inputs.CONDITION;
    input[1] = AND(NOT(EQ(item('Kind',v('xj')),s('S'))), input[1]);
  }
  after('bdatase_arhj4x7j', IF(is('xb','S'),[c('uSub829',v('xa'),plus(v('xbr'),1),plus(a('hi'),-1)),stop()]));
});

patch('Decode ord from one Unicode code point', () => {
  const costumes = T(IT).costumes, byName = new Map(costumes.map((c,i) => [c.name,i]));
  const exceptions = new Set();
  const ranges = fs.readFileSync(path.join(__dirname,'v255/pivot-exceptions.txt'),'ascii').trim().split(/\r?\n/);
  for (const row of ranges) { const [lo,hi,step] = row.split(' ').map(Number); for (let i=lo;i<=hi;i+=step) exceptions.add(i); }
  // Scratch compares strings case-insensitively. Read changing-case units by exact
  // costume name, reusing v4.254's fold keys. The few missing keys share one old SVG.
  const known = [];
  for (const cp of exceptions) {
    const unit = String.fromCharCode(cp); let i = byName.get('@cf828:' + unit);
    if (i === undefined) { i = costumes.length; costumes.push({...costumes[0], name:'@ord829:' + unit}); }
    known[i] = cp;
  }
  // Existing casefold keys may also match lowercase or identity exceptions. Use their
  // real ordinal too (e.g. ß, not the ordinal of the first character in "ss").
  for (const [name,i] of byName) if (name.startsWith('@cf828:') && name.slice(7).length === 1)
    known[i] = name.charCodeAt(7);
  B.addList(IT,'UExact829',Array.from({length:costumes.length},(_,i) => known[i] ?? -1));
  // First occurrence of each remaining (case-stable) unit is its true ordinal.
  // Pack 65,536 monotone search pivots into 256 pages, not 65,536 costumes. Surrogate
  // pages contain VALID pairs; a Scratch letter-of reads only their intended half.
  const pages = []; let pivot = '';
  for (let page=0;page<256;page++) {
    let row=''; for (let j=0;j<256;j++) {
      const u=page*256+j; if (!exceptions.has(u) && u !== 8) pivot=String.fromCharCode(u);
      row += page>=0xd8 && page<0xdc ? pivot+'\uDC00' : page>=0xdc && page<0xe0 ? '\uD800'+pivot : pivot;
    } pages.push(row);
  }
  B.addList(IT,'UPivots829',pages);
  vars('ordLo829','ordHi829','ordMid829','ordPos829','ordKey829','ordCode829','ordLead829','ordCost829');
  const sw=x=>I('looks_switchcostumeto',{inputs:{COSTUME:B.REP(x,[10,''])}});
  const costume=()=>I('looks_costumenumbername',{fields:{NUMBER_NAME:['number',null]}});
  const eq=(x,y)=>EQ(a(x),n(y));
  proc('uUnitOrd829',['unit','lo','hi'],[
    IF(eq('lo',0),[sv('ordCost829',costume()),sw(n(1)),sw(JOIN(s('@cf828:'),a('unit'))),
      IF(EQ(costume(),n(1)),[sw(JOIN(s('@ord829:'),a('unit')))]),
      sv('ordCode829',item('UExact829',costume())),sw(v('ordCost829')),IF(GT(v('ordCode829'),n(-1)),[stop()])]),
    sv('ordLo829',a('lo')),sv('ordHi829',a('hi')),
    REPEATU(NOT(LT(v('ordLo829'),v('ordHi829'))),[
      sv('ordMid829',FLOOR(DIV(ADD(v('ordLo829'),v('ordHi829')),n(2)))),sv('ordPos829',MOD(v('ordMid829'),n(256))),
      IFELSE(AND(GT(v('ordMid829'),n(0xd7ff)),LT(v('ordMid829'),n(0xe000))),
        [sv('ordPos829',ADD(MUL(v('ordPos829'),n(2)),n(1))),IF(GT(v('ordMid829'),n(0xdbff)),[chgV('ordPos829',n(1))])],
        [chgV('ordPos829',n(1))]),
      sv('ordKey829',letterOf(v('ordPos829'),item('UPivots829',ADD(n(1),FLOOR(DIV(v('ordMid829'),n(256))))))),
      IFELSE(LT(JOIN(s('#'),v('ordKey829')),JOIN(s('#'),a('unit'))),[sv('ordLo829',ADD(v('ordMid829'),n(1)))],
        [sv('ordHi829',v('ordMid829'))])]),sv('ordCode829',v('ordLo829')),
    // scratch-parser removes literal backspace from serialized strings. Slot 8
    // repeats slot 7; distinguish U+0008 and TAB at the only affected upper bound.
    IF(AND(is('ordCode829','9'),LT(JOIN(s('#'),a('unit')),s('#\t'))),[sv('ordCode829',n(8))])]);
  const unit=i=>letterOf(n(i),a('text'));
  proc('uOrd829',['text','kind'],[
    IF(NOT(EQ(a('kind'),s('S'))),[fail('TypeError: ord() expected a character'),stop()]),
    IF(EQ(lenOf(a('text')),n(1)),[c('uUnitOrd829',unit(1),n(0),n(65535)),...result(v('ordCode829'),'N'),stop()]),
    IF(EQ(lenOf(a('text')),n(2)),[IF(AND(uHigh829(()=>unit(1)),uLow829(()=>unit(2))),[
        c('uUnitOrd829',unit(1),n(0xd800),n(0xdbff)),sv('ordLead829',v('ordCode829')),
        c('uUnitOrd829',unit(2),n(0xdc00),n(0xdfff)),
        ...result(ADD(n(65536),ADD(MUL(SUB(v('ordLead829'),n(0xd800)),n(1024)),SUB(v('ordCode829'),n(0xdc00)))),'N'),stop()])]),
    fail('TypeError: ord() expected a single character')]);
  for (const id of ['bcontro_h0grzhtd','bwr_p6s8docuq']) setStack(id,'SUBSTACK',[
    c('uOrd829',v('ev'),v('evtype')),sv('pending',n(1))]);
});
