// P202: auto-indent on ENTER
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2];
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? [...l.value].map(String) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const K = (k, down) => vm.postIOData('keyboard', { key: k, isDown: down });
const tap = (k) => { K(k, true); step(4); K(k, false); step(4); };

let bad = 0;
const ck = (what, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? '  OK   ' : '  FAIL ') + what.padEnd(40) + ' got=' + JSON.stringify(got) + (ok ? '' : '  want=' + JSON.stringify(want))); };

// put `line` in the editor, park the caret at `col`, press ENTER, report the result
const enter = (line, col) => {
  const C = sl('Code'); C.value.length = 0; C.value.push(line);
  setG('selected', 1); setG('page', 1); setG('hscroll', 0); setG('cursor', col);
  setG('busy', 0); setG('running', 0); setG('selOn', 0); setG('dragSel', 0);
  step(3);
  tap('Enter');
  step(4);
  return { code: gl('Code'), cursor: Number(gv('cursor')), selected: Number(gv('selected')) };
};
const one = (line, col) => { const r = enter(line, col || line.length); return [r.code[1], r.cursor]; };

vm.start(); vm.greenFlag(); step(30);

console.log('=== ENTER at the end of the line ===');
const cases = [
  ['if x:', null, '    ', 4],
  ['for i in range(3):', null, '    ', 4],
  ['while x < 3:', null, '    ', 4],
  ['def f():', null, '    ', 4],
  ['class A:', null, '    ', 4],
  ['try:', null, '    ', 4],
  ['else:', null, '    ', 4],
  ['elif y:', null, '    ', 4],
  ['except ValueError:', null, '    ', 4],
  ['finally:', null, '    ', 4],
  ['print(1)', null, '', 0],
  ['x = 1', null, '', 0],
  ["x = {'a': 1}", null, '', 0],
  ['    pass', null, '    ', 4],
  ['        return 1', null, '        ', 8],
  ['    if y:', null, '        ', 8],
  ['  print(1)', null, '  ', 2],
  ['    ', null, '', 0],
  ['', null, '', 0],
  ['if x:  # note', null, '    ', 4],
  ['    # note', null, '    ', 4],
  ['print("a#b")', null, '', 0]
];
for (const [line, , wantLine, wantCur] of cases) {
  const got = one(line);
  ck('ENTER after ' + JSON.stringify(line), got, [wantLine, wantCur]);
}

console.log('=== ENTER in the middle of a line ===');
ck('split "    print(1)" before p', one('    print(1)', 4), ['    print(1)', 4]);
ck('split "    print(1)" inside', one('    print(1)', 9), ['    (1)', 4]);   // head "    print", tail "(1)"
ck('split "if x:" after if', one('if x:', 2), [' x:', 0]);
ck('split "abc" after a', one('abc', 1), ['bc', 0]);

console.log('=== the whole edit is one undo step ===');
{
  const C = sl('Code'); C.value.length = 0; C.value.push('if x:'); C.value.push('    pass');
  setG('selected', 2); setG('cursor', 8); setG('busy', 0); setG('running', 0); setG('saved', 1); setG('selOn', 0);
  step(3);
  tap('Enter');
  step(4);
  ck('two lines became three', gl('Code').length, 3);
  ck('the caret is on the new line', Number(gv('selected')), 3);
}
console.log('=== typing a block end to end ===');
{
  const C = sl('Code'); C.value.length = 0; C.value.push('');
  setG('selected', 1); setG('page', 1); setG('hscroll', 0); setG('cursor', 0);
  setG('busy', 0); setG('running', 0); setG('selOn', 0); setG('caps', 0); setG('saved', 1);
  step(3);
  for (const ch of 'if x:') tap(ch === ' ' ? ' ' : ch);
  tap('Enter');
  ck('after "if x:" + ENTER the caret is indented', Number(gv('cursor')), 4);
  for (const ch of 'print(1)') tap(ch === '(' ? '(' : ch === ')' ? ')' : ch === '1' ? '1' : ch);
  tap('Enter');
  ck('the next line keeps the indent', JSON.stringify(gl('Code')[2]), JSON.stringify('    '));
  tap('Enter');                                    // blank line -> leaves the block
  ck('ENTER on the blank line drops to column 0', Number(gv('cursor')), 0);
  for (const ch of 'print(2)') tap(ch === '(' ? '(' : ch === ')' ? ')' : ch === '2' ? '2' : ch);
  ck('the block reads back correctly', gl('Code'), ['if x:', '    print(1)', '', 'print(2)']);
}

console.log(bad === 0 ? '\nALL OK' : '\n' + bad + ' FAILURES');
vm.stopAll();
process.exit(bad === 0 ? 0 : 1);
