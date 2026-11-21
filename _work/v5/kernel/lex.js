'use strict';
/**
 * v5 Lexer - linear character state machine, no Scratch recursion.
 * Produces TokT / TokV / TokL plus an explicit indent stack (IndStk).
 *   N number   S string   F f-string   I identifier (name|case-sign)
 *   K keyword  O operator  W newline   > indent   < dedent   E eof
 */
const { E, S } = require('../dsl.js');
const L = require('./lib.js');

const KW = ' def return if elif else while for in break continue pass and or not is ' +
  'None True False import from class try except finally raise global nonlocal del ' +
  'assert lambda with yield as ';
const OPS2 = ' ** // == != <= >= += -= *= /= %= -> << >> ';
const OPS3 = ' **= //= >>= <<= ';

// copy len chars of src starting at start into dst (local helper; the lexer does not
// share the VM's macro set).
function copy(src, start, len, dst) {
  return [
    S.set('sk2', start), S.set('ctmp', E.str('')),
    S.Repeat(len, [S.set('ctmp', E.join(E.var('ctmp'), E.letter(E.var('sk2'), src))), S.chg('sk2', E.num(1))]),
    S.set(dst, E.var('ctmp')),
  ];
}
function tok(t, v) {
  return [S.ladd('TokT', E.str(t)), S.ladd('TokV', v), S.ladd('TokL', E.var('li'))];
}
const KWCHK = (nb) => E.contains(E.str(KW), E.join(E.str(' '), E.join(nb, E.str(' '))));

function body() {
  const le = () => E.var('le');
  const i = () => E.var('i');
  const ln = () => E.var('ln');
  const ch = (k) => E.letter(k, E.var('le'));

  // ---------------- one statement line ----------------
  const lineBody = [
    S.set('le', E.item('Code', E.var('li'))),
    S.set('ln', E.slen(E.var('le'))),
    S.set('i', E.num(1)),
    // contains(), not equals(): see lib.isSpaceCh -- on VMs that compare two zero-ish
    // strings numerically, `'0' == ' '` is true and this loop would eat a leading 0.
    S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.not(L.isSpaceCh(ch(E.var('i'))))), [
      S.chg('i', E.num(1)),
    ]),
    S.set('ind', E.sub(E.var('i'), E.num(1))),
    S.set('sk', E.num(0)),
    S.If(E.or(E.gt(E.var('i'), E.var('ln')), E.eq(ch(E.var('i')), E.str('#'))), [S.set('sk', E.num(1))]),
    S.If(E.eq(E.var('sk'), E.num(0)), [
      // ---- indentation bookkeeping ----
      S.set('cur', E.item('IndStk', E.len('IndStk'))),
      S.If(E.gt(E.var('ind'), E.var('cur')), [
        S.If(E.ne(E.var('ind'), E.add(E.var('cur'), E.num(4))),
          [L.failAt(E.str('IndentationError: expected an indented block'), E.var('li'))]),
        S.ladd('IndStk', E.var('ind')),
        ...tok('>', E.str('')),
      ], [
        S.If(E.lt(E.var('ind'), E.var('cur')), [
          S.Until(E.or(E.le(E.item('IndStk', E.len('IndStk')), E.var('ind')), E.le(E.len('IndStk'), E.num(1))), [
            S.ldel('IndStk', E.len('IndStk')),
            ...tok('<', E.str('')),
          ]),
          S.If(E.ne(E.item('IndStk', E.len('IndStk')), E.var('ind')),
            [L.failAt(E.str('IndentationError: unindent does not match'), E.var('li'))]),
        ]),
      ]),
      // ---- tokenize the rest of the line ----
      S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.not(E.eq(E.var('err'), E.str('')))), [
        S.set('c0', ch(E.var('i'))),
        S.If(L.isSpaceCh(E.var('c0')), [
          S.chg('i', E.num(1)),
        ], [
          S.If(E.eq(E.var('c0'), E.str('#')), [
            S.set('i', E.add(E.var('ln'), E.num(1))),
          ], [
            S.If(L.isAlpha(E.var('c0')), identBlock(), [
              S.If(L.isDigit(E.var('c0')), numberBlock(), [
                S.If(E.or(E.eq(E.var('c0'), E.str("'")), E.eq(E.var('c0'), E.str('"'))), stringBlock(), [
                  S.If(E.or(E.eq(E.var('c0'), E.str('[')), E.eq(E.var('c0'), E.str('{'))), [
                    S.set('cbbr', E.var('c0')),
                    ...compRewrite(),
                    S.If(E.eq(E.var('cbwr'), E.num(0)), [...opBlock()]),
                  ], [...opBlock()]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      S.If(E.eq(E.var('err'), E.str('')), [...tok('W', E.str(''))]),
    ]),
  ];

  // ---------------- identifier ----------------
  function identBlock() {
    return [
      S.set('nb', E.str('')),
      S.set('sg', E.str('')),
      S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.not(L.isNameCh(ch(E.var('i'))))), [
        S.set('c0', ch(E.var('i'))),
        S.set('nb', E.join(E.var('nb'), E.var('c0'))),
        ...L.charCode(E.var('c0'), 'n0'),
        S.If(L.isUpperChar(E.var('n0')), [
          S.set('sg', E.join(E.var('sg'), E.str('1'))),
        ], [
          S.set('sg', E.join(E.var('sg'), E.str('0'))),
        ]),
        S.chg('i', E.num(1)),
      ]),
      S.If(E.and(
        E.or(E.eq(E.var('nb'), E.str('f')), E.eq(E.var('nb'), E.str('F'))),
        E.or(E.eq(ch(E.var('i')), E.str("'")), E.eq(ch(E.var('i')), E.str('"')))
      ), [
        ...fstringBlock(),
      ], [
        S.If(E.and(KWCHK(E.var('nb')), E.or(E.not(E.contains(E.var('sg'), E.str('1'))),
          E.contains(E.str(' True False None '), E.join(E.str(' '), E.join(E.var('nb'), E.str(' ')))))), [
          ...tok('K', E.var('nb')),
        ], [
          ...tok('I', E.join(E.var('nb'), E.join(E.str('|'), E.var('sg')))),
        ]),
      ]),
    ];
  }

  // ---------------- number ----------------
  function numberBlock() {
    return [
      S.set('tx', E.str('')),
      S.set('brk', E.num(0)),
      S.set('dot', E.num(0)),
      S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.eq(E.var('brk'), E.num(1))), [
        S.set('c0', ch(E.var('i'))),
        S.If(L.isDigit(E.var('c0')), [
          S.set('tx', E.join(E.var('tx'), E.var('c0'))),
          S.chg('i', E.num(1)),
        ], [
          S.If(E.and(E.eq(E.var('c0'), E.str('.')), E.eq(E.var('dot'), E.num(0))), [
            S.set('dot', E.num(1)),
            S.set('tx', E.join(E.var('tx'), E.var('c0'))),
            S.chg('i', E.num(1)),
          ], [
            S.If(E.and(E.or(E.eq(E.var('c0'), E.str('e')), E.eq(E.var('c0'), E.str('E'))), E.gt(E.var('dot'), E.num(0))), [
              S.set('tx', E.join(E.var('tx'), E.str('e'))),
              S.chg('i', E.num(1)),
              S.set('c1', ch(E.var('i'))),
              S.If(E.or(E.eq(E.var('c1'), E.str('+')), E.eq(E.var('c1'), E.str('-'))), [
                S.set('tx', E.join(E.var('tx'), E.var('c1'))),
                S.chg('i', E.num(1)),
              ]),
              S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.not(L.isDigit(ch(E.var('i'))))), [
                S.set('tx', E.join(E.var('tx'), ch(E.var('i')))),
                S.chg('i', E.num(1)),
              ]),
            ], [
              S.set('brk', E.num(1)),
            ]),
          ]),
        ]),
      ]),
      ...tok('N', E.var('tx')),
    ];
  }

  // ---------------- string ----------------
  function stringBlock(kind) {
    const k = kind || 'S';
    return [
      S.set('q', ch(E.var('i'))),
      S.set('tx', E.str('')),
      S.chg('i', E.num(1)),
      S.set('brk', E.num(0)),
      S.Until(E.or(E.gt(E.var('i'), E.var('ln')), E.eq(E.var('brk'), E.num(1))), [
        S.set('c0', ch(E.var('i'))),
        S.If(E.eq(E.var('c0'), E.var('q')), [
          S.set('brk', E.num(1)),
        ], [
          S.If(E.eq(E.var('c0'), E.str('\\')), [
            S.chg('i', E.num(1)),
            S.set('c1', ch(E.var('i'))),
            S.If(E.eq(E.var('c1'), E.str('n')), [S.set('c1', E.str('\n'))]),
            S.If(E.eq(E.var('c1'), E.str('t')), [S.set('c1', E.str('\t'))]),
            S.If(E.eq(E.var('c1'), E.str('r')), [S.set('c1', E.str('\r'))]),
            S.set('tx', E.join(E.var('tx'), E.var('c1'))),
            S.chg('i', E.num(1)),
          ], [
            S.set('tx', E.join(E.var('tx'), E.var('c0'))),
            S.chg('i', E.num(1)),
          ]),
        ]),
      ]),
      S.chg('i', E.num(1)),
      ...tok(k, E.var('tx')),
    ];
  }

  // ---------------- f-string (rewritten to a normal expression) ----------------
  function fstringBlock() {
    const flush = () => [
      S.set('fdq', E.str("'")),
      S.If(E.contains(E.var('flit'), E.str("'")), [
        S.set('fdq', E.str('"')),
        S.If(E.contains(E.var('flit'), E.str('"')), [
          ...L.failAt(E.str('NotImplementedError: quote inside f-string literal'), E.var('li')),
        ]),
      ]),
      S.set('fout', E.join(E.var('fout'), E.join(E.var('fdq'), E.join(E.var('flit'),
        E.join(E.var('fdq'), E.str(' + ')))))),
      S.set('flit', E.str('')),
    ];
    return [
      S.set('fq', ch(E.var('i'))),
      S.set('fi', E.add(E.var('i'), E.num(1))),
      S.set('fout', E.str('')), S.set('flit', E.str('')), S.set('fbrk', E.num(0)),
      S.Until(E.or(E.gt(E.var('fi'), E.var('ln')), E.eq(E.var('fbrk'), E.num(1))), [
        S.set('c0', ch(E.var('fi'))),
        S.If(E.eq(E.var('c0'), E.var('fq')), [
          S.set('fbrk', E.num(1)),
        ], [
          S.If(E.eq(E.var('c0'), E.str('{')), [
            S.If(E.eq(ch(E.add(E.var('fi'), E.num(1))), E.str('{')), [
              S.set('flit', E.join(E.var('flit'), E.str('{'))),
              S.chg('fi', E.num(2)),
            ], [
              S.If(E.gt(E.slen(E.var('flit')), E.num(0)), [...flush()]),
              S.chg('fi', E.num(1)),
              S.set('fex', E.str('')), S.set('fconv', E.str('s')),
              S.Until(E.or(E.gt(E.var('fi'), E.var('ln')), E.eq(ch(E.var('fi')), E.str('}'))), [
                S.set('c1', ch(E.var('fi'))),
                S.If(E.eq(E.var('c1'), E.str('!')), [
                  S.set('fconv', ch(E.add(E.var('fi'), E.num(1)))),
                  S.chg('fi', E.num(2)),
                ], [
                  S.If(E.eq(E.var('c1'), E.str(':')), [
                    ...L.failAt(E.str('NotImplementedError: f-string format spec'), E.var('li')),
                    S.set('fi', E.add(E.var('ln'), E.num(1))),
                  ], [
                    S.set('fex', E.join(E.var('fex'), E.var('c1'))),
                    S.chg('fi', E.num(1)),
                  ]),
                ]),
              ]),
              S.set('ftmp', E.str('str(')),
              S.If(E.eq(E.var('fconv'), E.str('r')), [S.set('ftmp', E.str('repr('))]),
              S.set('fout', E.join(E.var('fout'), E.join(E.var('ftmp'), E.join(E.var('fex'), E.str(') + '))))),
              S.chg('fi', E.num(1)),
            ]),
          ], [
            S.If(E.eq(E.var('c0'), E.str('}')), [
              S.If(E.eq(ch(E.add(E.var('fi'), E.num(1))), E.str('}')), [
                S.set('flit', E.join(E.var('flit'), E.str('}'))),
                S.chg('fi', E.num(2)),
              ], [
                ...L.failAt(E.str('SyntaxError: single } in f-string'), E.var('li')),
                S.set('fbrk', E.num(1)),
              ]),
            ], [
              S.set('flit', E.join(E.var('flit'), E.var('c0'))),
              S.chg('fi', E.num(1)),
            ]),
          ]),
        ]),
      ]),
      S.If(E.gt(E.slen(E.var('flit')), E.num(0)), [...flush()]),
      S.If(E.and(E.gt(E.slen(E.var('fout')), E.num(3)),
        E.eq(E.letter(E.sub(E.slen(E.var('fout')), E.num(1)), E.var('fout')), E.str('+'))), [
        ...copy(E.var('fout'), E.num(1), E.sub(E.slen(E.var('fout')), E.num(3)), 'fout'),
      ]),
      S.If(E.eq(E.slen(E.var('fout')), E.num(0)), [S.set('fout', E.str("''"))]),
      ...copy(E.var('le'), E.num(1), E.sub(E.var('i'), E.num(1)), 'lf'),
      ...copy(E.var('le'), E.add(E.var('fi'), E.num(1)), E.sub(E.var('ln'), E.var('fi')), 'rt'),
      S.set('le', E.join(E.var('lf'), E.join(E.var('fout'), E.var('rt')))),
      S.set('ln', E.slen(E.var('le'))),
    ];
  }
  // ---------------- list comprehension ----------------
  // [BODY for VAR in ITER] is rewritten in place to __lc(ITER, VAR, BODY), a normal call that
  // the compiler special-cases into an ITER/NEXT/append loop.  The rewrite keeps the lexer
  // non-recursive: only the current line is spliced and the same scan loop re-lexes it.
  function compRewrite() {
    const j3 = (a) => E.join(ch(a), E.join(ch(E.add(a, E.num(1))), ch(E.add(a, E.num(2)))));
    return [
      S.set('cbwr', E.num(0)),
      S.set('cbj', E.add(E.var('i'), E.num(1))),
      S.set('cbd', E.num(1)), S.set('cbq', E.str('')), S.set('cbf', E.num(0)), S.set('cbf2', E.num(0)), S.set('cbif', E.num(0)), S.set('cbc', E.num(0)), S.set('cbok', E.num(0)),
      S.Until(E.or(E.gt(E.var('cbj'), E.var('ln')), E.eq(E.var('cbd'), E.num(0))), [
        S.set('cbt', ch(E.var('cbj'))),
        S.If(E.not(E.eq(E.var('cbq'), E.str(''))), [
          S.If(E.eq(E.var('cbt'), E.var('cbq')), [S.set('cbq', E.str(''))]),
          S.chg('cbj', E.num(1)),
        ], [
          S.If(E.or(E.eq(E.var('cbt'), E.str("'")), E.eq(E.var('cbt'), E.str('"'))), [
            S.set('cbq', E.var('cbt')), S.chg('cbj', E.num(1)),
          ], [
            S.If(E.or(E.or(E.eq(E.var('cbt'), E.str('[')), E.eq(E.var('cbt'), E.str('('))), E.eq(E.var('cbt'), E.str('{'))), [
              S.chg('cbd', E.num(1)), S.chg('cbj', E.num(1)),
            ], [
              S.If(E.or(E.or(E.eq(E.var('cbt'), E.str(']')), E.eq(E.var('cbt'), E.str(')'))), E.eq(E.var('cbt'), E.str('}'))), [
                S.chg('cbd', E.num(-1)),
                S.If(E.gt(E.var('cbd'), E.num(0)), [S.chg('cbj', E.num(1))]),
              ], [
                S.If(E.and(E.eq(E.var('cbd'), E.num(1)), L.isSpaceCh(ch(E.sub(E.var('cbj'), E.num(1))))), [
                  S.If(E.eq(j3(E.var('cbj')), E.str('for')), [
                    S.If(E.eq(E.var('cbf'), E.num(0)), [S.set('cbf', E.var('cbj'))], [
                      S.If(E.eq(E.var('cbf2'), E.num(0)), [S.set('cbf2', E.var('cbj'))], [S.set('cbok', E.num(1))]),
                    ]),
                  ]),
                  S.If(E.and(E.gt(E.var('cbf'), E.num(0)),
                    E.eq(E.join(ch(E.var('cbj')), ch(E.add(E.var('cbj'), E.num(1)))), E.str('if'))), [
                    S.If(E.eq(E.var('cbif'), E.num(0)), [S.set('cbif', E.var('cbj'))], [S.set('cbok', E.num(1))]),
                  ]),
                ]),
                // first top-level ':' before the 'for' separates key and value in a dict comp
                S.If(E.and(E.eq(E.var('cbd'), E.num(1)), E.and(E.eq(E.var('cbf'), E.num(0)),
                  E.and(E.eq(E.var('cbc'), E.num(0)), E.eq(E.var('cbt'), E.str(':'))))), [
                  S.set('cbc', E.var('cbj')),
                ]),
                S.chg('cbj', E.num(1)),
              ]),
            ]),
          ]),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('cbd'), E.num(0)), E.and(E.gt(E.var('cbf'), E.num(0)),
        E.and(E.eq(E.var('cbok'), E.num(0)), E.or(E.not(E.eq(E.var('cbbr'), E.str('{'))), E.gt(E.var('cbc'), E.num(0)))))), [
        S.set('cbi', E.add(E.var('cbf'), E.num(3))), S.set('cbok', E.num(0)),
        S.Until(E.or(E.gt(E.var('cbi'), E.var('cbj')), E.eq(E.var('cbok'), E.num(1))), [
          S.If(E.eq(E.join(ch(E.var('cbi')), E.join(ch(E.add(E.var('cbi'), E.num(1))), E.join(ch(E.add(E.var('cbi'), E.num(2))), ch(E.add(E.var('cbi'), E.num(3)))))), E.str(' in ')), [
            S.set('cbok', E.num(1)),
          ], [S.chg('cbi', E.num(1))]),
        ]),
        S.set('cbi2', E.add(E.var('cbf2'), E.num(3))), S.set('cbok', E.num(0)),
        S.If(E.gt(E.var('cbf2'), E.num(0)), [
          S.Until(E.or(E.gt(E.var('cbi2'), E.var('cbj')), E.eq(E.var('cbok'), E.num(1))), [
            S.If(E.eq(E.join(ch(E.var('cbi2')), E.join(ch(E.add(E.var('cbi2'), E.num(1))), E.join(ch(E.add(E.var('cbi2'), E.num(2))), ch(E.add(E.var('cbi2'), E.num(3)))))), E.str(' in ')), [
              S.set('cbok', E.num(1)),
            ], [S.chg('cbi2', E.num(1))]),
          ]),
        ], [S.set('cbok', E.num(1))]),
        S.If(E.eq(E.var('cbok'), E.num(1)), [
          ...copy(E.var('le'), E.num(1), E.sub(E.var('i'), E.num(1)), 'cbl'),
          S.If(E.gt(E.var('cbf2'), E.num(0)), [
            ...copy(E.var('le'), E.add(E.var('cbi'), E.num(4)), E.sub(E.var('cbf2'), E.add(E.var('cbi'), E.num(4))), 'cbt'),
            S.set('cbn', E.join(E.str('__lc2('), E.join(E.var('cbt'), E.str(',')))),
            ...copy(E.var('le'), E.add(E.var('cbf'), E.num(3)), E.sub(E.var('cbi'), E.add(E.var('cbf'), E.num(3))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(',')))),
            ...copy(E.var('le'), E.add(E.var('cbi2'), E.num(4)), E.sub(E.var('cbj'), E.add(E.var('cbi2'), E.num(4))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(',')))),
            ...copy(E.var('le'), E.add(E.var('cbf2'), E.num(3)), E.sub(E.var('cbi2'), E.add(E.var('cbf2'), E.num(3))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(',')))),
            ...copy(E.var('le'), E.add(E.var('i'), E.num(1)), E.sub(E.var('cbf'), E.add(E.var('i'), E.num(1))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(')')))),
          ], [
          S.set('cbe', E.var('cbj')),
          S.If(E.gt(E.var('cbif'), E.num(0)), [S.set('cbe', E.sub(E.var('cbif'), E.num(1)))]),
          ...copy(E.var('le'), E.add(E.var('cbi'), E.num(4)), E.sub(E.var('cbe'), E.add(E.var('cbi'), E.num(4))), 'cbt'),
          S.set('cbn', E.join(E.str('__lc('), E.join(E.var('cbt'), E.str(',')))),
          S.If(E.gt(E.var('cbif'), E.num(0)), [
            S.set('cbn', E.join(E.str('__lcif('), E.join(E.var('cbt'), E.str(',')))),
          ]),
          S.If(E.eq(E.var('cbbr'), E.str('{')), [
            S.set('cbn', E.join(E.str('__dc('), E.join(E.var('cbt'), E.str(',')))),
          ]),
          ...copy(E.var('le'), E.add(E.var('cbf'), E.num(3)), E.sub(E.var('cbi'), E.add(E.var('cbf'), E.num(3))), 'cbt'),
          S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(',')))),
          S.If(E.eq(E.var('cbbr'), E.str('{')), [
            ...copy(E.var('le'), E.add(E.var('i'), E.num(1)), E.sub(E.var('cbc'), E.add(E.var('i'), E.num(1))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.join(E.var('cbt'), E.str(',')))),
            ...copy(E.var('le'), E.add(E.var('cbc'), E.num(1)), E.sub(E.var('cbf'), E.add(E.var('cbc'), E.num(1))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.var('cbt'))),
          ], [
            ...copy(E.var('le'), E.add(E.var('i'), E.num(1)), E.sub(E.var('cbf'), E.add(E.var('i'), E.num(1))), 'cbt'),
            S.set('cbn', E.join(E.var('cbn'), E.var('cbt'))),
            S.If(E.gt(E.var('cbif'), E.num(0)), [
              ...copy(E.var('le'), E.add(E.var('cbif'), E.num(2)), E.sub(E.var('cbj'), E.add(E.var('cbif'), E.num(2))), 'cbt'),
              S.set('cbn', E.join(E.var('cbn'), E.join(E.str(','), E.var('cbt')))),
            ]),
          ]),
          S.set('cbn', E.join(E.var('cbn'), E.str(')'))),
          ]),
          ...copy(E.var('le'), E.add(E.var('cbj'), E.num(1)), E.sub(E.var('ln'), E.var('cbj')), 'cbr'),
          S.set('le', E.join(E.var('cbl'), E.join(E.var('cbn'), E.var('cbr')))),
          S.set('ln', E.slen(E.var('le'))),
          S.set('cbwr', E.num(1)),
        ]),
      ]),
    ];
  }
  // ---------------- operator ----------------
  function opBlock() {
    return [
      S.set('c0', ch(E.var('i'))),
      S.set('c1', ch(E.add(E.var('i'), E.num(1)))),
      S.set('tx', E.join(E.var('c0'), E.var('c1'))),
      S.set('tx3', E.join(E.var('tx'), ch(E.add(E.var('i'), E.num(2))))),
      S.If(E.contains(E.str(OPS3), E.join(E.str(' '), E.join(E.var('tx3'), E.str(' ')))), [
        ...tok('O', E.var('tx3')),
        S.chg('i', E.num(3)),
      ], [
      S.If(E.contains(E.str(OPS2), E.join(E.str(' '), E.join(E.var('tx'), E.str(' ')))), [
        ...tok('O', E.var('tx')),
        S.chg('i', E.num(2)),
      ], [
        ...tok('O', E.var('c0')),
        S.chg('i', E.num(1)),
      ]),
      ]),
    ];
  }

  return lineBody;
}

function build(em) {
  em.defineProc('Interpreter', 'lex_all', [], () => [
    S.ldelall('TokT'), S.ldelall('TokV'), S.ldelall('TokL'), S.ldelall('IndStk'),
    S.ladd('IndStk', E.num(0)),
    S.set('li', E.num(1)),
    S.Repeat(E.len('Code'), [
      S.If(E.eq(E.var('err'), E.str('')), body()),
      S.chg('li', E.num(1)),
    ]),
    S.If(E.eq(E.var('err'), E.str('')), [
      S.Until(E.le(E.len('IndStk'), E.num(1)), [
        S.ldel('IndStk', E.len('IndStk')),
        ...tok('<', E.str('')),
      ]),
      ...tok('E', E.str('')),
    ]),
  ], true);
}

module.exports = { build, KW, OPS2 };
