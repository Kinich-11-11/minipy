'use strict';
// Find the rule that made the community importer drop 7 argument_reporter blocks:
// print each argument_reporter_string_number block with its enclosing procedure,
// warp flag, shadow flag, reference type, whether it survived in deployed.
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
function loadJson(f) {
    const buf = fs.readFileSync(f);
    if (buf.slice(0, 2).toString('latin1') === 'PK') return JSON.parse(zipRead(f).find((e) => e.name === 'project.json').data.toString('utf8'));
    return JSON.parse(buf.toString('utf8'));
}
const L = loadJson('D:/编程/scratch/ai/minipython/MiniPy_v4.197.sb3');
const D = loadJson('D:/编程/scratch/ai/minipython/_work/web/deployed.sb3');

function procInfo(B, id) {
    let cur = id, d = 0;
    while (cur && d++ < 200) {
        const b = B[cur];
        if (!b) return null;
        if (b.opcode === 'procedures_definition') {
            const proto = B[b.inputs.custom_block[1]];
            if (!proto || !proto.mutation) return null;
            return { proccode: proto.mutation.proccode, warp: proto.mutation.warp };
        }
        cur = b.parent;
    }
    return null;
}

const rows = [];
for (const t of L.targets) {
    const B = t.blocks || {};
    const DB = (D.targets.find((x) => x.name === t.name) || {}).blocks || {};
    const refTypes = new Map();
    for (const [id, b] of Object.entries(B)) {
        if (!b) continue;
        for (const [slot, inp] of Object.entries(b.inputs || {})) {
            if (Array.isArray(inp) && typeof inp[1] === 'string') {
                if (!refTypes.has(inp[1])) refTypes.set(inp[1], []);
                refTypes.get(inp[1]).push('t' + inp[0]);
            }
        }
    }
    for (const [id, b] of Object.entries(B)) {
        if (!b || b.opcode !== 'argument_reporter_string_number') continue;
        const p = procInfo(B, id);
        rows.push({
            target: t.name, id, arg: b.fields && b.fields.VALUE ? b.fields.VALUE[0] : '',
            shadow: b.shadow, refs: (refTypes.get(id) || []).join(','),
            proc: p ? p.proccode : '<no proc>', warp: p ? p.warp : '?',
            kept: !!DB[id]
        });
    }
}

const groups = new Map();
for (const r of rows) {
    const k = [r.target, 'shadow=' + r.shadow, 'refs=' + r.refs, 'warp=' + r.warp, r.kept ? 'KEPT' : 'DROPPED'].join(' | ');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
}
console.log('total argument reporters:', rows.length, ' dropped:', rows.filter((r) => !r.kept).length);
console.log('--- groups ---');
for (const [k, v] of [...groups.entries()].sort()) console.log(k + '  n=' + v.length + (v.length <= 12 ? '  [' + v.map((r) => r.proc + ':' + r.arg).join('; ') + ']' : ''));
console.log('--- dropped detail ---');
for (const r of rows.filter((x) => !x.kept)) console.log(JSON.stringify(r));
