const fs = require('fs');
let s = fs.readFileSync('_work/v41/p454.txt', 'utf8');
const from = `      const o = [];
      collect(q.inputs.CONDITION, o);
      if (o.indexOf('list') < 0) continue;
      dbg2++;
      console.log('[P454] ifcand ' + id + ' names=' + o.join(',') + ' hasSub=' + !!q.inputs.SUBSTACK);`;
const to = `      const o = [];
      collect(q.inputs.CONDITION, o);
      if (o.indexOf('list') < 0 || o.indexOf('fn') < 0) continue;
      if (!q.inputs.SUBSTACK) continue;
      dbg2++;
      handler = id;
      console.log('[P454] ifcand(handler) ' + id + ' names=' + o.join(','));
      break;`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p454.txt', s.replace(from, to));
console.log('handler selection fixed');