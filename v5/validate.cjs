'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { edges, forest } = require('./graph.cjs');
const invalidXML = /[\u0000-\u0008\u000b-\u001f\ud800-\udfff\ufffe\uffff]/u;
function validate(p, entries) {
  const stage = p.targets.find((t) => t.isStage),
    files = new Map(entries.map((e) => [e.name, e.data]));
  for (const t of p.targets) {
    const b = t.blocks,
      owners = new Map(),
      procs = new Map();
    for (const [k, x] of Object.entries(b)) {
      if (/^operator_(add|subtract|multiply|divide|mod)$/.test(x.opcode))
        assert(
          Object.keys(x.inputs).every((n) => ['NUM1', 'NUM2'].includes(n)),
          `invalid arithmetic operand on ${k}`,
        );
      if (x.opcode === 'procedures_prototype') {
        assert(!procs.has(x.mutation.proccode), 'duplicate prototype');
        procs.set(x.mutation.proccode, JSON.parse(x.mutation.argumentids));
      }
      for (const child of edges(x)) {
        assert(b[child], `missing child ${child}`);
        assert(!owners.has(child), `shared child ${child}`);
        owners.set(child, k);
      }
      for (const v of Object.values(x.inputs))
        for (const a of v.slice(1))
          if (Array.isArray(a) && typeof a[1] === 'string')
            assert(!invalidXML.test(a[1]), `non-roundtrippable XML literal on ${k}`);
      for (const f of Object.values(x.fields))
        if (typeof f[0] === 'string') assert(!invalidXML.test(f[0]), `invalid XML field on ${k}`);
      const decl = (id, n, field) =>
        assert(
          [t, stage].some((z) => z[field]?.[id]?.[0] === n),
          `${t.name}: missing ${field}/${n} in ${k}`,
        );
      if (x.fields.LIST) decl(x.fields.LIST[1], x.fields.LIST[0], 'lists');
      if (x.fields.VARIABLE) decl(x.fields.VARIABLE[1], x.fields.VARIABLE[0], 'variables');
      for (const v of Object.values(x.inputs))
        for (const val of v.slice(1))
          if (Array.isArray(val) && [12, 13].includes(val[0]))
            decl(val[2], val[1], val[0] === 12 ? 'variables' : 'lists');
    }
    for (const [k, x] of Object.entries(b)) {
      assert.equal(owners.get(k) || null, x.parent, `parent ${k}`);
      assert.equal(x.topLevel, !owners.has(k), `root ${k}`);
      if (x.opcode === 'procedures_call') {
        const want = procs.get(x.mutation.proccode);
        assert(want, 'undefined ' + x.mutation.proccode);
        assert.deepEqual(
          Object.keys(x.inputs).sort(),
          [...want].sort(),
          `signature ${x.mutation.proccode}`,
        );
      }
    }
    assert.equal(forest(t).size, Object.keys(b).length, `disconnected cycle in ${t.name}`);
    for (const c of [...t.costumes, ...t.sounds]) {
      const file = c.md5ext || `${c.assetId}.${c.dataFormat}`;
      assert(files.has(file), `missing asset ${file}`);
    }
  }
  for (const [name, data] of files)
    if (name !== 'project.json') {
      assert.equal(
        crypto.createHash('md5').update(data).digest('hex'),
        name.split('.')[0],
        `asset ${name}`,
      );
    }
}
module.exports = { validate };
