const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
let c=fs.readFileSync(P+'astutil.js','utf8');
let ok=0;
if(c.includes("    ...L.setAt('NdA', E.var(dst), aux),\n    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),\n    S.set('i', E.num(0)),")){ c=c.split("    ...L.setAt('NdA', E.var(dst), aux),\n    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),\n    S.set('i', E.num(0)),").join("    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),\n    S.set('i', E.num(0)),"); ok++; } else console.log('MISS1');
if(c.includes("  st.push(...L.setAt('NdN', E.var(dst), cntExpr));")){ c=c.split("  st.push(...L.setAt('NdN', E.var(dst), cntExpr));").join("  st.push(...L.setAt('NdA', E.var(dst), aux));\n  st.push(...L.setAt('NdN', E.var(dst), cntExpr));"); ok++; } else console.log('MISS2');
fs.writeFileSync(P+'astutil.js', c);
console.log('applied', ok, '/2');
