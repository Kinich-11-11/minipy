const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
let n=0; const bad=[];
function rep(a,b,tag){
  if(c.indexOf(a)>=0){ c=c.split(a).join(b); n++; return true; }
  const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10));
  if(c.indexOf(a2)>=0){ c=c.split(a2).join(b); n++; return true; }
  bad.push(tag); return false;
}
// A) exception name table
rep("'list', 'repr'];",
"'list', 'repr'];"+String.fromCharCode(10)+
"const EXCNAMES = ['Exception', 'ZeroDivisionError', 'ValueError', 'TypeError', 'NameError',"+String.fromCharCode(10)+
"  'IndexError', 'KeyError', 'AttributeError', 'SyntaxError', 'NotImplementedError',"+String.fromCharCode(10)+
"  'AssertionError', 'StopIteration', 'RuntimeError'];", 'A');
// B) create the classes during VM init
const anchorB="...L.setAt('FrKind', E.num(1), E.str('M')),";
const ib=c.indexOf(anchorB);
if(ib>=0){
  const ls=c.lastIndexOf(String.fromCharCode(10), ib);
  const ins=[
    "...EXCNAMES.flatMap((nm) => [",
    "      S.chg('cTop', E.num(1)),",
    "      ...L.setAt('ClName', E.var('cTop'), E.str(nm)),",
    "      ...L.setAt('ClBase', E.var('cTop'), E.num(0)),",
    "      S.chg('mTop', E.num(1)), S.set('xcm', E.var('mTop')),",
    "      ...L.setAt('MapHead', E.var('xcm'), E.num(0)),",
    "      ...L.setAt('MapParent', E.var('xcm'), E.var('GlobMap')),",
    "      ...L.setAt('MapKind', E.var('xcm'), E.str('C')),",
    "      ...L.setAt('ClMap', E.var('cTop'), E.var('xcm')),",
    "      S.chg('bTop', E.num(1)),",
    "      ...L.setAt('BindName', E.var('bTop'), E.str(nm)),",
    "      ...L.setAt('BindVal', E.var('bTop'), E.join(E.str('C'), E.var('cTop'))),",
    "      ...L.setAt('BindNext', E.var('bTop'), E.item('MapHead', E.var('GlobMap'))),",
    "      ...L.setAt('MapHead', E.var('GlobMap'), E.var('bTop')),",
    "    ]),"
  ].join(String.fromCharCode(10))+String.fromCharCode(10);
  c=c.slice(0,ls+1)+ins+c.slice(ls+1); n++;
} else bad.push('B');
// C) raise helper
rep("function reraiseBlock() { return [...unwind()]; }",
  "function reraiseBlock() { return [...unwind()]; }"+String.fromCharCode(10)+
  "  const excVal = (name) => E.str('C' + (EXCNAMES.indexOf(name) + 1));"+String.fromCharCode(10)+
  "  const raiseBuiltin = (name) => [S.set('raised', E.num(1)), S.set('curEx', excVal(name)), ...unwind()];", 'C');
// D) division by zero now raises
rep("S.set('res', E.str('')), S.set('rt', E.str('N')),", "S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0)),", 'D1');
rep("S.If(E.eq(op(), E.str('/')), [S.set('res', E.div(E.var('na'), E.var('nb')))]),",
  "S.If(E.eq(op(), E.str('/')), ["+String.fromCharCode(10)+
  "        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')],"+String.fromCharCode(10)+
  "          [S.set('res', E.div(E.var('na'), E.var('nb')))]),"+String.fromCharCode(10)+
  "      ]),", 'D2');
rep("[...L.failAt(E.str('ZeroDivisionError: division by zero'), E.var('pc'))],", "[...raiseBuiltin('ZeroDivisionError')],", 'D3');
rep("[...L.failAt(E.str('ZeroDivisionError: modulo by zero'), E.var('pc'))], [", "[...raiseBuiltin('ZeroDivisionError')], [", 'D4');
// E) do not push a result when an exception was raised
rep(["S.If(E.eq(E.var('rt'), E.str('N')), [...vpush(E.join(E.str(''), E.var('res')))], [",
     "        ...vpush(E.var('res')),",
     "      ]),"].join(String.fromCharCode(10)),
    ["S.If(E.eq(E.var('raised'), E.num(0)), [",
     "        S.If(E.eq(E.var('rt'), E.str('N')), [...vpush(E.join(E.str(''), E.var('res')))], [",
     "          ...vpush(E.var('res')),",
     "        ]),",
     "      ]),"].join(String.fromCharCode(10)), 'E');
fs.writeFileSync(P,c);
console.log('applied',n,'missed:',JSON.stringify(bad));