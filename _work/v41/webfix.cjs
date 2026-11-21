'use strict';
/**
 * web-fix: make a built MiniPy .sb3 safe for the 小码王社区 importer.
 *
 * The community importer "compresses" simple reporter blocks into inline
 * primitives ([12,name,id] for data_variable, [13,name,id] for
 * data_listcontents) and then deletes the block.  If such a block is
 * referenced from more than one input, the importer inlines only the first
 * reference and deletes the block anyway -> every other reference dangles.
 * The community player VM then throws
 *   TypeError: Cannot read properties of null (reading '_isHat')
 * on every frame once the interpreter reaches code that touches the dangling
 * input, which freezes MiniPy at the first `print(...)`.
 *
 * The importer also collapses a block into its input shadow when the block is
 * flagged `shadow: true` but used as a real input (observed: 7 argument
 * reporters in `scrollone` / `loadCode` became the literals 0 / "" on the
 * community site).  The builder's argReporter() creates
 * `argument_reporter_string_number` blocks with shadow:true even for procedure
 * bodies, so those arguments silently turn into constants on the website.
 *
 * This pass rewrites the project so none of that can happen:
 *   1. a data_variable / data_listcontents block referenced by >1 input is
 *      inlined as a primitive at every reference and removed;
 *   2. other input-multi-referenced blocks are deep-cloned (one owner each);
 *   3. blocks flagged shadow:true that are used as real inputs get shadow:false
 *      (they are not shadows).
 *
 * CLI:  node webfix.cjs <in.sb3|project.json> <out.sb3|out.json> [--no-shadow] [--no-clone]
 */
const fs = require('fs');
const { zipRead, zipWrite } = require('../sb3lib.js');

function primitiveFor(b) {
    if (!b || !b.fields) return null;
    if (b.opcode === 'data_variable' && Array.isArray(b.fields.VARIABLE)) {
        const [name, id] = b.fields.VARIABLE;
        return [12, name, id];
    }
    if (b.opcode === 'data_listcontents' && Array.isArray(b.fields.LIST)) {
        const [name, id] = b.fields.LIST;
        return [13, name, id];
    }
    return null;
}

/** deep-clone the block subtree rooted at `id`; new ids everywhere.
 *  Returns the new root id. `parent` of the clone root is set to rootParent. */
function cloneSubtree(blocks, id, rootParent, nid) {
    const src = blocks[id];
    if (!src) return null;
    const newId = nid();
    const b = {
        opcode: src.opcode, next: null, parent: rootParent,
        inputs: {}, fields: JSON.parse(JSON.stringify(src.fields || {})),
        shadow: !!src.shadow, topLevel: false
    };
    if (src.mutation) b.mutation = JSON.parse(JSON.stringify(src.mutation));
    blocks[newId] = b;
    for (const [slot, inp] of Object.entries(src.inputs || {})) {
        if (!Array.isArray(inp)) { b.inputs[slot] = inp; continue; }
        const copy = JSON.parse(JSON.stringify(inp));
        if ((inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string') {
            copy[1] = cloneSubtree(blocks, inp[1], newId, nid);
        }
        b.inputs[slot] = copy;
    }
    if (typeof src.next === 'string') b.next = cloneSubtree(blocks, src.next, newId, nid);
    return newId;
}

function normalizeProject(project, opts = {}) {
    const cloneMulti = opts.cloneMulti !== false;   // default on
    const fixShadow = opts.fixShadow !== false;     // default on: body blocks must not be flagged shadow
    const report = { inlinedMulti: [], cloned: [], shadowFixed: [], multiNext: [], dangling: [] };
    let seq = 0;
    const rnd = () => Math.random().toString(36).slice(2, 8);
    const nid = () => { seq++; return 'bwfix_' + seq.toString(36) + rnd(); };

    for (const t of project.targets) {
        const blocks = t.blocks || {};
        const inputRefs = new Map();
        const nextRefs = new Map();
        const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
        for (const [id, b] of Object.entries(blocks)) {
            if (!b) continue;
            for (const [slot, inp] of Object.entries(b.inputs || {})) {
                if (!Array.isArray(inp)) continue;
                if ((inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string') add(inputRefs, inp[1], { from: id, slot, type: inp[0] });
            }
            if (typeof b.next === 'string') add(nextRefs, b.next, { from: id });
        }
        // dangling references (should never exist in a fresh build)
        for (const [id, refs] of inputRefs) if (!blocks[id]) report.dangling.push({ target: t.name, id, refs });
        for (const [id, refs] of nextRefs) if (!blocks[id]) report.dangling.push({ target: t.name, id, kind: 'next', refs });

        // 1) multi-owned primitive reporters -> inline everywhere, drop block
        for (const [bid, refs] of inputRefs) {
            if (refs.length < 2) continue;
            const b = blocks[bid];
            if (!b) continue;
            const prim = primitiveFor(b);
            if (!prim) continue;
            for (const r of refs) {
                const parent = blocks[r.from];
                const old = parent.inputs[r.slot];
                parent.inputs[r.slot] = r.type === 3 ? [3, prim, old[2]] : [2, prim];
            }
            delete blocks[bid];
            report.inlinedMulti.push({ target: t.name, id: bid, opcode: b.opcode, refs: refs.length });
            if (process.env.V41_DBG_INLINE) console.log('[DBG-INLINE]', JSON.stringify(report.inlinedMulti[report.inlinedMulti.length-1]), JSON.stringify(b.inputs || {}).slice(0, 200), 'fields:', JSON.stringify(b.fields || {}).slice(0, 120));
        }
        // 1b) any other multi-owned input block: clone so each reference owns a block
        if (cloneMulti) for (const [bid, refs] of inputRefs) {
            if (refs.length < 2 || !blocks[bid]) continue;
            for (let i = 1; i < refs.length; i++) {
                const r = refs[i];
                const parent = blocks[r.from];
                const newId = cloneSubtree(blocks, bid, r.from, nid);
                if (!newId) continue;
                const old = parent.inputs[r.slot];
                parent.inputs[r.slot] = r.type === 3 ? [3, newId, old[2]] : [2, newId];
                report.cloned.push({ target: t.name, id: bid, opcode: blocks[bid] ? blocks[bid].opcode : '?', to: newId });
            }
        }
        // 2) blocks flagged shadow:true that are actually used as real inputs
        //    (prototype shadows are referenced with input type 1 and stay untouched).
        //    Recompute the reference map: the clones from step 1b inherit the
        //    shadow flag of the block they were copied from.
        if (fixShadow) {
            const freshRefs = new Map();
            for (const [id, b] of Object.entries(blocks)) {
                if (!b) continue;
                for (const [slot, inp] of Object.entries(b.inputs || {})) {
                    if (!Array.isArray(inp)) continue;
                    if ((inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string') add(freshRefs, inp[1], { from: id, slot, type: inp[0] });
                }
            }
            for (const [id, b] of Object.entries(blocks)) {
                if (!b || !b.shadow) continue;
                const refs = freshRefs.get(id) || [];
                if (refs.some((r) => r.type === 2 || r.type === 3)) {
                    b.shadow = false;
                    report.shadowFixed.push({
                        target: t.name, id, opcode: b.opcode,
                        arg: b.fields && b.fields.VALUE ? b.fields.VALUE[0] : undefined
                    });
                }
            }
        }
        // final safety: no dangling references may remain
        const finalRefs = new Map();
        for (const [id, b] of Object.entries(blocks)) {
            if (!b) continue;
            for (const [slot, inp] of Object.entries(b.inputs || {})) {
                if (!Array.isArray(inp)) continue;
                if ((inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string') add(finalRefs, inp[1], { from: id, slot });
            }
            if (typeof b.next === 'string') add(finalRefs, b.next, { from: id });
        }
        for (const [id, refs] of finalRefs) {
            if (!blocks[id]) report.dangling.push({ target: t.name, id, refs });
        }
        for (const [id, refs] of nextRefs) {
            const n = (nextRefs.get(id) || []).length;
            if (n > 1) report.multiNext.push({ target: t.name, id, opcode: blocks[id] ? blocks[id].opcode : '?', refs: n });
        }
    }
    return report;
}

function summarize(report) {
    const d = report.dangling.length;
    return {
        inlinedMulti: report.inlinedMulti.length,
        cloned: report.cloned.length,
        shadowFixed: report.shadowFixed.length,
        unreferencedNext: report.multiNext.length,
        dangling: d,
        detail: report
    };
}

function loadProject(file) {
    const buf = fs.readFileSync(file);
    if (buf.slice(0, 2).toString('latin1') === 'PK') {
        const entries = zipRead(file);
        const pj = entries.find((e) => e.name === 'project.json');
        return { json: JSON.parse(pj.data.toString('utf8')), entries };
    }
    return { json: JSON.parse(buf.toString('utf8')), entries: null };
}

function writeProject(outFile, json, entries) {
    if (outFile.toLowerCase().endsWith('.json') || !entries) {
        fs.writeFileSync(outFile, JSON.stringify(json));
        return;
    }
    const out = entries.map((e) => e.name === 'project.json'
        ? { name: e.name, data: Buffer.from(JSON.stringify(json), 'utf8') }
        : e);
    zipWrite(out, outFile);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const files = args.filter((a) => !a.startsWith('--'));
    const [inFile, outFile] = files;
    if (!inFile || !outFile) {
        console.error('usage: node webfix.cjs <in.sb3|project.json> <out.sb3|out.json> [--no-shadow] [--no-clone]');
        process.exit(2);
    }
    const { json, entries } = loadProject(inFile);
    const report = normalizeProject(json, {
        fixShadow: !args.includes('--no-shadow'),
        cloneMulti: !args.includes('--no-clone')
    });
    if (json.meta && json.meta.agent && !/webfix/.test(json.meta.agent)) json.meta.agent += ' + webfix';
    writeProject(outFile, json, entries);
    console.log(JSON.stringify(summarize(report), null, 1));
    console.log('written -> ' + outFile);
}
module.exports = { normalizeProject, primitiveFor, cloneSubtree, summarize, loadProject, writeProject };
