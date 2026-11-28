'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { zipRead, zipWrite } = require('../_work/sb3lib.js');
const { validate } = require('./validate.cjs');
const root = path.resolve(__dirname, '..'),
  base = require('./baseline.json');
const builtin = ['ownership', 'source', 'frames', 'calls', 'layout', 'names', 'owners', 'state', 'ascii-fused'];
const digest = (v) => crypto.createHash('sha256').update(v).digest('hex');
function plan(modules, names) {
  const table = new Map(),
    order = [],
    done = new Set(),
    pending = new Set(),
    owners = new Map();
  for (const m of modules) {
    assert(!table.has(m.id), 'duplicate patch ' + m.id);
    table.set(m.id, m);
  }
  function visit(id) {
    const m = table.get(id);
    assert(m, 'unknown patch ' + id);
    if (done.has(id)) return;
    assert(!pending.has(id), 'dependency cycle ' + id);
    pending.add(id);
    m.after.forEach(visit);
    for (const k of m.writes) {
      assert(!owners.has(k), `conflicting writers: ${owners.get(k)} and ${id} (${k})`);
      owners.set(k, id);
    }
    order.push(m);
    pending.delete(id);
    done.add(id);
  }
  names.forEach(visit);
  return order;
}
function build({ out, core = false, only, extensions = [] }) {
  const lock = core ? require('./core-lock.json') : base,
    input = path.resolve(root, lock.file),
    frozen = fs.readFileSync(input);
  assert.equal(digest(frozen), lock.sha256, 'unexpected base SHA-256');
  const target = path.resolve(out),
    checkpoint = path.join(__dirname, 'MiniPy_v5-core.sb3');
  const canonical = (f) => {
    const s = fs.existsSync(f)
      ? fs.realpathSync.native(f)
      : path.join(fs.realpathSync.native(path.dirname(f)), path.basename(f));
    return process.platform === 'win32' ? s.toLowerCase() : s;
  };
  for (const file of [input, path.resolve(root, base.file)])
    assert.notEqual(canonical(target), canonical(file), 'refusing to overwrite input');
  if (core || only || extensions.length)
    assert.notEqual(
      canonical(target),
      canonical(checkpoint),
      'refusing to overwrite checkpoint with a partial or downstream build',
    );
  const mods = core
      ? extensions
      : [...builtin.map((n) => require('./patches/' + n + '.cjs')), ...extensions],
    order = plan(mods, only ?? mods.map((m) => m.id));
  if (core && !order.length) {
    const tmp = target + '.' + crypto.randomUUID() + '.tmp';
    try {
      fs.writeFileSync(tmp, frozen);
      fs.renameSync(tmp, target);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
    return { input: lock.sha256, sha256: lock.sha256, bytes: frozen.length, changes: {} };
  }
  const entries = zipRead(frozen),
    pj = entries.find((e) => e.name === 'project.json'),
    p = JSON.parse(pj.data),
    changes = {};
  for (const m of order) changes[m.id] = m.apply(p);
  validate(p, entries);
  if (!core || order.length)
    p.meta.agent = 'MiniPy v5 / ' + (core ? 'core + ' : '') + order.map((m) => m.id).join(',');
  pj.data = Buffer.from(JSON.stringify(p));
  const tmp = target + '.' + crypto.randomUUID() + '.tmp';
  try {
    zipWrite(entries, tmp);
    fs.renameSync(tmp, target);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  return {
    input: lock.sha256,
    sha256: digest(fs.readFileSync(target)),
    bytes: fs.statSync(target).size,
    jsonBytes: pj.data.length,
    changes,
  };
}
if (require.main === module) {
  const args = process.argv.slice(2),
    o = { out: path.join(__dirname, 'MiniPy_v5-core.sb3'), extensions: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from-core') o.core = true;
    else if (args[i] === '--only') o.only = args[++i].split(',');
    else if (args[i] === '--out') o.out = args[++i];
    else if (args[i] === '--patch') o.extensions.push(require(path.resolve(args[++i])));
    else throw Error('Unknown option ' + args[i]);
  }
  if (!o.core && o.only && path.resolve(o.out) === path.resolve(__dirname, 'MiniPy_v5-core.sb3'))
    throw Error('Use --out for partial builds');
  console.log(JSON.stringify(build(o), null, 2));
}
module.exports = { build, plan };
