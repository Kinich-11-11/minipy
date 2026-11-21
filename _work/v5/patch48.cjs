const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/build5.js';
let c=fs.readFileSync(P,'utf8');
const A="  K.build(em, project);"+String.fromCharCode(10)+"  em.finish();";
const B=[
  "  K.build(em, project);",
  "  em.finish();",
  "",
  "  // ---- shrink the Interpreter's Scratch-variable count (plan section 10) ----",
  "  if (!process.env.V5_NOREG) {",
  "    const st = require('./regalloc.js').optimize(project);",
  "    console.log('[regalloc] vars ' + st.before + ' -> ' + st.after + ' (pooled ' + st.pooled +",
  "      ' locals into ' + st.slots + ' slots; pinned ' + st.pinned + ', of which read-before-write ' +",
  "      st.readBeforeWrite + '; ' + st.rewrites + ' references rewritten)')",
  "  }"
].join(String.fromCharCode(10));
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('wired'); } else console.log('MISS');
fs.writeFileSync(P,c);