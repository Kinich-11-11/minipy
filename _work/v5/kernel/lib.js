'use strict';
/**
 * v5 kernel shared macros (build-time JS -> flat Scratch blocks).
 */
const { E, S } = require('../dsl.js');

// ------------------------------------------------ value representation
const DIGITS = '0123456789';
const NUMSTART = '0123456789-.';
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const NAMECH = LETTERS + DIGITS;
const isNum = (v) => E.contains(E.str(NUMSTART), E.letter(E.num(1), v));
const isDigit = (c) => E.contains(E.str(DIGITS), c);
const isAlpha = (c) => E.contains(E.str(LETTERS), c);
const isNameCh = (c) => E.contains(E.str(NAMECH), c);
// Whitespace must NOT be tested with operator_equals against a one character string:
// some scratch-vm builds compare two zero-ish strings numerically (TurboWarp: '0' == '\t'
// is TRUE because both coerce to 0), which would make the digit 0 look like a space and
// silently drop it from the token stream.  contains() is a pure string test in every VM.
const isSpaceCh = (c) => E.contains(E.str(' \t'), c);
const tagOf = (v) => E.letter(E.num(1), v);
const isTag = (v, t) => E.eq(E.letter(E.num(1), v), E.str(t));
const Bv = (b) => E.str(b ? 'B1' : 'B0');
const NONE = () => E.str('Z');
const txt = (t) => E.join(E.str('S'), t);
const numtxt = (v) => E.join(E.str(''), v);

// a console line (Output is capped at 300 like v4)
// The pane shows OUT_ROWS rows starting at `outpage`. Pinning outpage=1 made every
// line past row 9 unreachable (demo2_nested's final "Done" was never drawn), so
// follow the tail instead: keep the newest line visible, and only leave outpage at
// 1 while the output still fits on one screen.
const OUT_ROWS = 9;
const outLine = (e) => [
  S.ladd('Output', e),
  S.While(E.gt(E.len('Output'), E.num(300)), [S.ldel('Output', E.num(1))]),
  S.If(E.gt(E.len('Output'), E.num(OUT_ROWS)),
    [S.set('outpage', E.sub(E.len('Output'), E.num(OUT_ROWS - 1)))],
    [S.set('outpage', E.num(1))]),
  S.set('dirty', E.num(1)),
];

// error latch: first error wins, records the source line
const failAt = (msg, line) => [S.If(E.eq(E.var('err'), E.str('')), [
  S.set('err', msg),
  S.set('pc', line),
])];

// character code (ASCII) via the Interpreter costume table; 31 + costume no.
const charCode = (cExpr, dst) => [
  S.Costume(E.join(E.str('_'), cExpr)),
  S.set(dst, E.costumeNum()),
];
const isUpperChar = (nExpr) => E.and(E.ge(nExpr, E.num(34)), E.le(nExpr, E.num(59)));

// payload of a value into dst
function payInto(src, dst) {
  return [
    S.set(dst, E.str('')),
    S.If(isNum(src), [S.set(dst, src)], [
      S.set('ti', E.num(2)),
      S.Repeat(E.sub(E.slen(src), E.num(1)), [
        S.set(dst, E.join(E.var(dst), E.letter(E.var('ti'), src))),
        S.chg('ti', E.num(1)),
      ]),
    ]),
  ];
}

// case signature of a string into dst ('1' for A-Z, '0' otherwise)
function signInto(src, dst) {
  return [
    S.set(dst, E.str('')),
    S.set('ti', E.num(1)),
    S.Repeat(E.slen(src), [
      S.set('c9', E.letter(E.var('ti'), src)),
      ...charCode(E.var('c9'), 'n9'),
      S.If(isUpperChar(E.var('n9')), [
        S.set(dst, E.join(E.var(dst), E.str('1'))),
      ], [
        S.set(dst, E.join(E.var(dst), E.str('0'))),
      ]),
      S.chg('ti', E.num(1)),
    ]),
  ];
}

// write list[i] = v, growing the list when i is one past the end
const setAt = (list, i, v) => [
  S.If(E.gt(i, E.len(list)), [S.ladd(list, v)], [S.lset(list, i, v)]),
];
// push a value onto a manual-pointer stack
const pushL = (list, ptr, v) => [
  S.chg(ptr, E.num(1)),
  S.If(E.gt(E.var(ptr), E.len(list)), [S.ladd(list, v)], [S.lset(list, E.var(ptr), v)]),
];
// push ONE row across several parallel lists sharing one manual pointer
function pushRow(ptr, pairs) {
  const st = [S.chg(ptr, E.num(1)), S.set('prw', E.gt(E.var(ptr), E.len(pairs[0][0])))];
  for (const [list, v] of pairs) {
    st.push(S.If(E.var('prw'), [S.ladd(list, v)], [S.lset(list, E.var(ptr), v)]));
  }
  return st;
}

module.exports = {
  DIGITS, NUMSTART, LETTERS, NAMECH, isNum, isDigit, isAlpha, isNameCh, isSpaceCh, tagOf, isTag,
  Bv, NONE, txt, numtxt, outLine, failAt, charCode, isUpperChar,
  payInto, signInto, pushL, pushRow, setAt,
};
