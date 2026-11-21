// _mkexpected.mjs
// 全套件期望输出生成：CPython 侧只跑一遍（与版本无关），存 _curve/expected.json。
// 套件构成 = v4.219 报告口径：主套件+探针(168) + _cov*(681) + _gap131.json(82) = 931
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const HERE = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41';
const OUT = path.join(HERE, '_curve');
fs.mkdirSync(OUT, { recursive: true });
const PY = process.env.PYEXE || 'python';
const TMPF = path.join(HERE, '_curve/_tmp_expected.py');

const MAIN = ['_new1_alias','_new1add','_new2_algo','_new3_str','_new4_oop','_new5_func',
  '_new6_edge','_new7_probe','_new7add','_new8_probe2','_new9_probe3','_new10_probe4'];
const COV = ['_cov1','_cov2','_cov3','_cov4','_cov5','_cov6','_cov7','_cov8','_cov9','_cov10',
  '_cov205a','_cov205b','_cov205c','_cov205d','_cov205e','_covC','_covD','_covX','_covY','_covZ','_covheap'];

function parseTxt(file) {
  const tag = path.basename(file).replace(/\.[^.]+$/, '');
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const cases = [];
  let cur = null;
  for (const ln of lines) {
    if (ln.startsWith('### ')) {
      if (cur) cases.push(cur);
      let name = ln.slice(4).trim();
      let expectError = false;
      if (name.startsWith('!')) { expectError = true; name = name.slice(1).trim(); }
      cur = { name, tag, code: [], expectError };
    } else if (cur) cur.code.push(ln);
  }
  if (cur) cases.push(cur);
  for (const c of cases) {
    while (c.code.length && c.code[c.code.length - 1] === '') c.code.pop();
    c.code = c.code.join('\n');
    if (!c.expectError) delete c.expectError;
  }
  return cases;
}

function cpython(code, inputs) {
  fs.writeFileSync(TMPF, code + '\n');
  try {
    const out = execFileSync(PY, [TMPF], { input: (inputs || []).join('\n') + (inputs && inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONHASHSEED: '0' } });
    return { ok: true, out: out.replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')) };
  } catch (e) {
    return { ok: false, out: (((e.stdout || '') + '')).replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')), err: String(e.stderr || e.message).split('\n').filter(Boolean).pop() };
  }
}

const all = [];
for (const t of MAIN.concat(COV)) {
  const cs = parseTxt(path.join(HERE, t + '.txt'));
  for (const c of cs) c.proto = 'txt';
  all.push(...cs);
}
const gap = JSON.parse(fs.readFileSync(path.join(HERE, '_gap131.json'), 'utf8'));
for (const c of gap) { c.tag = c.tag || 'gap131'; c.proto = 'iso'; all.push(c); }

console.error('cases=' + all.length);
let i = 0;
for (const c of all) {
  const py = cpython(c.code, c.inputs);
  c.exp = py.out;
  if (py.err) c.pyerr = py.err;
  if (!py.ok && !c.expectError) c.pyfail = true; // CPython 自身都跑不起来的用例（应为 0 个）
  i++;
  if (i % 100 === 0) console.error('  ' + i + '/' + all.length);
}
const bad = all.filter(c => c.pyfail);
if (bad.length) console.error('WARN cpython-fail cases: ' + bad.map(b => b.tag + '/' + b.name).join(', '));
fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(all));
console.log('expected.json written: ' + all.length + ' cases');
