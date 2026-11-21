const fs = require('fs');
let s = fs.readFileSync('_work/v41/p433.txt', 'utf8');
// (a) 去掉对形参 lo/hi 的赋值
s = s.replace(`        setV('vmOn', num(1)),
        setV('lo', num(1)),
        setV('hi', num(0))
      ])`, `        setV('vmOn', num(1))
      ])`);
// (b) 在 self=iid 之后找 calluser(cfull, lo, hi) 并包成 IFELSE（vmOn==1 时传空区间）
const from = `    console.log('[P433] ' + procName + ' self-assign=' + setSelf + ' params=' + names.join(','));`;
const to = `    console.log('[P433] ' + procName + ' self-assign=' + setSelf + ' params=' + names.join(','));
    // 找 self 绑定之后、以 cfull 为第 1 个实参的调用，把它包成"vmOn==1 时用空区间"
    let callSite = null;
    {
      let c = setSelf, steps = 0;
      const scan = (id) => {
        let x = id;
        while (x && steps < 40) {
          const q = BB[x];
          if (!q) break;
          if (q.opcode === 'procedures_call' && q.mutation && JSON.stringify(q.inputs || {}).indexOf('cfull') >= 0) { callSite = x; break; }
          for (const [k, v] of Object.entries(q.inputs || {})) {
            if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') scan(v[1]);
          }
          x = q.next; steps++;
        }
      };
      scan(BB[setSelf].next);
    }
    if (callSite) {
      console.log('[P433] ' + procName + ' cfull call=' + callSite + ' (' + String(BB[callSite].mutation.proccode) + ')');
      const proto2 = (() => { for (const id of Object.keys(BB)) { const b = BB[id]; if (b.opcode === 'procedures_prototype' && b.mutation && String(b.mutation.proccode) === String(BB[callSite].mutation.proccode)) return b; } return null; })();
      const akeys = Object.keys(BB[callSite].inputs);
      const origLo = BB[callSite].inputs[akeys[1]];
      const origHi = BB[callSite].inputs[akeys[2]];
      const alt = I('procedures_call', {
        inputs: (() => { const o = {}; o[akeys[0]] = BB[callSite].inputs[akeys[0]]; o[akeys[1]] = [2, num(1)]; o[akeys[2]] = [2, num(0)];
          for (let i = 3; i < akeys.length; i++) o[akeys[i]] = BB[callSite].inputs[akeys[i]]; return o; })(),
        mutation: { tagName: 'mutation', children: [], proccode: String(BB[callSite].mutation.proccode), argumentids: String(BB[callSite].mutation.argumentids), warp: String(BB[callSite].mutation.warp) }
      });
      insertBeforeStmt(callSite, [
        IFELSE(EQ(VAR('vmOn'), num(1)), [alt], [callSite])
      ]);
      BB[callSite].parent = BB[alt].parent;
      console.log('[P433] wrapped the cfull call with the empty-range variant');
    } else {
      console.log('[P433] WARNING: cfull call not found after self-assign in ' + procName);
    }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p433.txt', s.replace(from, to));
console.log('empty-range wrapper installed');