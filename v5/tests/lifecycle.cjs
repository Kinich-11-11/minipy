'use strict';
const fs = require('node:fs'),
  assert = require('node:assert/strict');
const { session } = require('./run.cjs');
const later = () => new Promise((r) => setImmediate(r));
async function main() {
  const [archive, output, ...flags] = process.argv.slice(2),
    s = await session(archive),
    vm = s.vm,
    r = vm.runtime;
  const stage = Object.fromEntries(
      Object.values(r.getTargetForStage().variables).map((v) => [v.name, v]),
    ),
    it = Object.fromEntries(
      Object.values(r.targets.find((t) => t.getName() === 'Interpreter').variables).map((v) => [
        v.name,
        v,
      ]),
    );
  const report = { sha256: s.sha256, node: process.version, checks: [] },
    save = () => fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
  function start(code, mode = 0) {
    const lines = code.split('\n');
    stage.Code.value = lines.slice();
    for (const [k, v] of Object.entries({
      mode,
      ticket: 0,
      running: 1,
      stopreq: 0,
      error: '',
      speed: 1,
    }))
      stage[k].value = v;
    r.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    return lines;
  }
  async function until(test, budget = 20000) {
    const t = Date.now();
    do {
      r._step();
      if (test()) return;
      await later();
    } while (Date.now() - t < budget);
    throw Error('timeout at ' + stage.pc.value + ' / ' + stage.status.value);
  }
  function clean(lines, expected) {
    assert.deepEqual(stage.Code.value, lines);
    assert.deepEqual(stage.Output.value.map(String), expected);
    assert.equal(+stage.busy.value, 0);
    for (const n of ['FnStack', 'FrGen', 'FrBase', 'VSave', 'LSave'])
      assert.equal(it[n].value.length, 0, n);
  }
  async function check(name, test) {
    try {
      await test();
      report.checks.push({ name, pass: true });
    } catch (e) {
      report.checks.push({ name, pass: false, error: String(e.message) });
    }
    save();
  }
  try {
    // Only one explicit initial stop. No host-side reset of interpreter data or
    // output between RUNs; the handlers have to restore their own invariants.
    vm.stopAll();
    await check('step -> pause -> HALT -> next RUN', async () => {
      const l = start('a = (1 +\n    2)\nprint(a)', 1);
      await until(() => String(stage.status.value).includes('Paused'));
      assert.deepEqual(stage.Code.value, l);
      stage.stopreq.value = 1;
      r.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
      await until(() => !+stage.running.value);
      assert.deepEqual(stage.Code.value, l);
      const lines = start('print("after halt")');
      await until(() => !+stage.running.value);
      clean(lines, ['after halt']);
    });
    for (const mode of [0, 1])
      await check('input transport mode ' + mode, async () => {
        const l = start("v = input('hello:')\nprint(v)", mode);
        const question = () => setImmediate(() => r.emit('ANSWER', 'blue'));
        r.on('QUESTION', question);
        try {
          await until(() => {
            stage.ticket.value = 20;
            if (String(stage.status.value) === 'Waiting for input')
              (stage.stdin || it.stdin).value = 'blue';
            return !+stage.running.value;
          });
          assert(!stage.error.value);
          assert.deepEqual(stage.Code.value, l);
          assert(stage.Output.value.join('').includes('blue'));
        } finally {
          r.off('QUESTION', question);
          (stage.stdin || it.stdin).value = '';
        }
      });
    await check('60 consecutive RUNs: error, recovery, recursion', async () => {
      for (let i = 0; i < 20; i++) {
        let l = start('x = 42\nprint(1 / 0)');
        await until(() => !+stage.running.value);
        assert.match(String(stage.error.value), /^ZeroDivisionError:/);
        assert.deepEqual(stage.Code.value, l);
        l = start('try:\n    print(x)\nexcept NameError:\n    print("fresh")');
        await until(() => !+stage.running.value);
        clean(l, ['fresh']);
        l = start('def f(n):\n    if not n: return 0\n    return 1 + f(n-1)\nprint(f(8))');
        await until(() => !+stage.running.value);
        clean(l, ['8']);
      }
    });
    await check('over-limit -> fresh RUN', async () => {
      const l = start(Array(1002).fill('pass').join('\n'));
      await until(() => !+stage.running.value, 60000);
      assert.match(String(stage.error.value), /^LimitError:/);
      assert.deepEqual(stage.Code.value, l);
      const ok = start('print(7)');
      await until(() => !+stage.running.value);
      clean(ok, ['7']);
    });
    if (flags.includes('--path-state')) {
      const balanced = () => {
        assert.equal(+it.w7dep.value,0,'path depth');
        assert.equal(it.VStack.value.length,0,'evaluation value stack');
        assert.deepEqual(stage.Names.value.filter(n=>['__pi','__pw','__pv'].includes(n)),[]);
      };
      await check('uncaught nested path error -> fresh RUN',async()=>{
        const l=start('m=[[0]]*2\nm[0][9]=7');
        await until(()=>!+stage.running.value);
        assert.match(String(stage.error.value),/^IndexError:/);
        assert.deepEqual(stage.Code.value,l);
        balanced();
        const ok=start('m=[[0]]*2\nm[0][0]=7\nprint(m)');
        await until(()=>!+stage.running.value);
        clean(ok,['[[7], [7]]']);
        balanced();
      });
      await check('STEP nested write -> pause -> HALT -> fresh shared child',async()=>{
        const l=start('m=[[0]]*2\nm[0][0]=5\nprint(m)',1);
        await until(()=>String(stage.status.value).includes('Paused'));
        stage.ticket.value=2;
        await until(()=>+stage.pc.value>=3&&String(stage.status.value).includes('Paused'));
        balanced();
        stage.stopreq.value=1;
        r.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'HALT'});
        await until(()=>!+stage.running.value);
        assert.deepEqual(stage.Code.value,l);
        const ok=start('m=[[0]]*2\nm[1][0]=7\nprint(m)');
        await until(()=>!+stage.running.value);
        clean(ok,['[[7], [7]]']);
        balanced();
      });
    }
  } finally {
    vm.quit();
    save();
  }
  return report.checks.every((c) => c.pass) ? 0 : 1;
}
console.log = console.warn = () => {};
main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e);
    process.exit(2);
  });
