'use strict';
/**
 * Simulate the 小码王社区 sb3 -> project.json importer as observed on
 * https://community-wscdn.xmwol.com/composition/<id>.sb3 (deployed v4.197).
 *
 * Observed behaviour (reverse engineered by diffing the uploaded
 * MiniPy_v4.197.sb3 against the file the community player actually loads):
 *   * blocks of opcode data_variable / data_listcontents are replaced by the
 *     compressed primitive in the referencing input ([12,name,varId] /
 *     [13,name,listId]) and the block is removed;
 *   * the conversion walks the block table once; after the block has been
 *     removed, later references are skipped, so a block with more than one
 *     owner leaves the remaining references dangling.
 *   * (separately) it also drops a handful of shadow:true argument reporters
 *     and adds an enhance_setFramerate block + flag hat to the Stage - those
 *     are ignored here.)
 *
 * usage: node sim_importer.cjs <in.sb3|project.json> <out.json>
 * prints {inlined, deleted, dangling:[...]}
 */
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const INLINEABLE = new Set(['data_variable', 'data_listcontents']);

function primitiveOf(b) {
    if (!b || !b.fields) return null;
    if (b.opcode === 'data_variable' && Array.isArray(b.fields.VARIABLE)) return [12, b.fields.VARIABLE[0], b.fields.VARIABLE[1]];
    if (b.opcode === 'data_listcontents' && Array.isArray(b.fields.LIST)) return [13, b.fields.LIST[0], b.fields.LIST[1]];
    return null;
}

function loadJson(file) {
    const buf = fs.readFileSync(file);
    if (buf.slice(0, 2).toString('latin1') === 'PK') {
        const entries = zipRead(file);
        return JSON.parse(entries.find((e) => e.name === 'project.json').data.toString('utf8'));
    }
    return JSON.parse(buf.toString('utf8'));
}

const P = loadJson(process.argv[2]);
let inlined = 0;
let deleted = 0;
const shadowBody = [];
const dangling = [];
for (const t of P.targets) {
    const B = t.blocks || {};
    for (const id of Object.keys(B)) {          // insertion order, like the importer
        const b = B[id];
        if (!b) continue;
        for (const [slot, inp] of Object.entries(b.inputs || {})) {
            if (!Array.isArray(inp) || (inp[0] !== 2 && inp[0] !== 3)) continue;
            const ref = inp[1];
            if (typeof ref !== 'string') continue;
            const rb = B[ref];
            if (!rb) { dangling.push({ target: t.name, from: id, slot, ref }); continue; }
            if (INLINEABLE.has(rb.opcode)) {
                const prim = primitiveOf(rb);
                if (prim) {
                    b.inputs[slot] = inp[0] === 3 ? [3, prim, inp[2]] : [2, prim];
                    delete B[ref];
                    deleted++;
                    inlined++;
                    continue;
                }
            }
            // advisory only: blocks flagged shadow:true that are used as real
            // blocks.  The community converter collapsed 7 of these into their
            // shadow literal, but it left the other ~2035 alone, so the exact
            // rule is unknown - do not model a deletion here.
            if (rb.shadow) shadowBody.push({ target: t.name, from: id, slot, ref, opcode: rb.opcode });
        }
    }
}
const out = process.argv[3];
if (out) fs.writeFileSync(out, JSON.stringify(P));
console.log(JSON.stringify({
    file: process.argv[2], deleted, inlined, shadowFlaggedBodyBlocks: shadowBody.length,
    dangling: dangling.length, shadowFlaggedDetail: shadowBody.slice(0, 20), danglingDetail: dangling
}, null, 1));
