const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'vm.js','utf8');
c=c.split("      ...L.outLine(E.join(E.str('DBG mif='), E.join(E.var('mif'), E.join(E.str(' fb='), E.join(E.item('FnBody', E.var('mif')), E.join(E.str(' cm='), E.item('ClMap', E.var('clo')))))))),\n").join('');
let ok=0;
function rep(o,n,tag){ if(c.includes(o)){ c=c.split(o).join(n); ok++; } else console.log('MISS '+tag); }
// lookupIn yields the tagged value 'F<id>'; callUser needs the numeric id
rep("        S.set('nargs', E.add(E.var('nargs'), E.num(1)))," + NL + "        ...callUser(E.var('mif')),",
    "        S.set('nargs', E.add(E.var('nargs'), E.num(1)))," + NL + "        ...L.payInto(E.var('mif'), 'mifid')," + NL + "        ...callUser(E.var('mifid')),", 'callUser id');
fs.writeFileSync(P+'vm.js', c);
console.log('applied', ok, '/1, dbg removed');
