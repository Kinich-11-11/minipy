const fs = require('fs');
let s = fs.readFileSync('_work/v41/p434.txt', 'utf8');
const from = `      insertBeforeStmt(callSite, [
        IFELSE(EQ(VAR('vmOn'), num(1)), [alt], [callSite])
      ]);
      BB[callSite].parent = BB[alt].parent;
      console.log('[P434] wrapped the cfull call with the empty-range variant');`;
const to = `      const after = BB[callSite].next;      // 关键：原调用后面的语句要留给 IFELSE 的 next，不能让 callSite 自己还挂着
      BB[callSite].next = null;
      const gate = IFELSE(EQ(VAR('vmOn'), num(1)), [alt], [callSite]);
      insertBeforeStmt(callSite, [gate]);
      BB[gate].next = after;
      if (after) BB[after].parent = gate;
      console.log('[P434] wrapped the cfull call with the empty-range variant (tail preserved)');`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P434').join('P435');
fs.writeFileSync('_work/v41/p435.txt', s);
console.log('tail-preserving wrapper installed');