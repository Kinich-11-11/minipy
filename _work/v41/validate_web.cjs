'use strict';
// Validate that a MiniPy .sb3 is safe for the 小码王社区 importer:
//   * no dangling block references at all;
//   * no block of an importer-inlined opcode (data_variable / data_listcontents)
//     is referenced by more than one input (that is exactly what makes the
//     importer delete the block while leaving the other refs dangling);
//   * no block flagged shadow:true that is used as a real input (the community
//     converter collapses those into their shadow literal);
//   * report the remaining next-shared blocks (the importer keeps those).
// usage: node validate_web.cjs <project.sb3|project.json>
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const INLINEABLE = new Set(['data_variable', 'data_listcontents']);

function loadJson(file) {
    const buf = fs.readFileSync(file);
    if (buf.slice(0, 2).toString('latin1') === 'PK') {
        const entries = zipRead(file);
        return JSON.parse(entries.find((e) => e.name === 'project.json').data.toString('utf8'));
    }
    return JSON.parse(buf.toString('utf8'));
}

const P = loadJson(process.argv[2]);
let dangling = [];
let multiInline = [];
let multiNext = [];
let shadowAsBlock = [];
for (const t of P.targets) {
    const B = t.blocks || {};
    const inRefs = new Map();
    const nextRefs = new Map();
    const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    for (const [id, b] of Object.entries(B)) {
        if (!b) continue;
        for (const [slot, inp] of Object.entries(b.inputs || {})) {
            if (!Array.isArray(inp)) continue;
            if ((inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string') add(inRefs, inp[1], id + '.' + slot);
        }
        if (typeof b.next === 'string') add(nextRefs, b.next, id + '.next');
    }
    for (const [id, refs] of inRefs) {
        if (!B[id]) { dangling.push({ target: t.name, id, refs, kind: 'input' }); continue; }
        if (INLINEABLE.has(B[id].opcode) && refs.length > 1) multiInline.push({ target: t.name, id, opcode: B[id].opcode, refs });
        if (B[id].shadow) shadowAsBlock.push({ target: t.name, id, opcode: B[id].opcode, refs });
    }
    for (const [id, refs] of nextRefs) {
        if (!B[id]) { dangling.push({ target: t.name, id, refs, kind: 'next' }); continue; }
        if (refs.length > 1) multiNext.push({ target: t.name, id, opcode: B[id].opcode, refs: refs.length });
    }
}
const ok = dangling.length === 0 && multiInline.length === 0 && shadowAsBlock.length === 0;
console.log(JSON.stringify({
    file: process.argv[2],
    ok,
    dangling: dangling.length,
    multiOwnedInlineable: multiInline.length,
    shadowFlaggedBodyBlocks: shadowAsBlock.length,
    nextShared: multiNext.length,
    danglingDetail: dangling,
    multiInlineDetail: multiInline,
    shadowFlaggedDetail: shadowAsBlock.slice(0, 20)
}, null, 1));
process.exit(ok ? 0 : 1);
