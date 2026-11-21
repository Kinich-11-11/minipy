const fs = require('fs');
let s = fs.readFileSync('_work/v41/p422.txt', 'utf8');
const from = `  const items = stmts.filter((id) => procOf(id).indexOf('listitem') === 0);
  if (items.length < 2) throw new Error('[P422] expected 2 listitem calls in dictfmt, got ' + items.length);
  const second = items[1];
  const after = BB[second].next;
  if (!after || procOf(after).indexOf('reprval') !== 0) {
    throw new Error('[P422] the statement after the 2nd listitem is not reprval: ' + procOf(after));
  }
  console.log('[P422] value listitem=' + second + ' reprval=' + after);`;
const to = `  // 取 dictfmt 里**最后**那个 reprval（= "值"那一次的兜底），它的前一条应是与"值"配对的 listitem
  const rvs = stmts.filter((id) => procOf(id).indexOf('reprval') === 0);
  if (rvs.length < 2) throw new Error('[P422] expected >=2 reprval calls in dictfmt, got ' + rvs.length);
  const after = rvs[rvs.length - 1];
  const preds = stmts.filter((id) => BB[id].next === after);
  const second = preds[0];
  if (!second || procOf(second).indexOf('listitem') !== 0) {
    throw new Error('[P422] predecessor of the value reprval is not a listitem: ' + (second ? procOf(second) : 'none'));
  }
  console.log('[P422] value listitem=' + second + ' reprval=' + after + ' (rvs=' + rvs.length + ')');`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p422.txt', s.replace(from, to));
console.log('value reprval selection fixed');