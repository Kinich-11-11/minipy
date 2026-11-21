const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let ok=0;
function patch(file,o,n,tag){ let c=fs.readFileSync(P+file,'utf8'); if(c.includes(o)){ fs.writeFileSync(P+file, c.split(o).join(n)); ok++; } else console.log('MISS '+tag); }
patch('pexpr.js', "const pushV = (nd, kw) => L.pushRow('pvSp', [['Pv', nd], ['Pk', kw]]);", "// the kwarg name for the value about to be pushed lives in `kwpend`\nconst pushV = (nd) => [...L.pushRow('pvSp', [['Pv', nd], ['Pk', E.var('kwpend')]]), S.set('kwpend', E.str(''))];", 'pushV');
patch('parse.js', "          S.lset('Pk', E.var('pvSp'), E.item('NdA', E.var('v0'))),\n          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),", "          S.set('kwpend', E.item('NdA', E.var('v0'))),\n          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),", 'inEq');
// reset kwpend at statement start so it cannot leak
patch('parse.js', "      S.set('pcSp', E.num(0)),", "      S.set('pcSp', E.num(0)), S.set('kwpend', E.str('')),", 'kwpend-reset');
console.log('applied', ok, '/3');
