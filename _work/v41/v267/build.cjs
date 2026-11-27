'use strict';
/*
 * MiniPy v4.267 -- running code must not modify the editor's source.
 *
 * Root cause: the interpreter's source-preparation passes (splitlines,
 * joinlines, expandlines, dqPrep263) and the runtime generator desugaring
 * (evalCtx828 -> gxN helper defs) read and WRITE the Stage list `Code`, which
 * is exactly the list the text editor displays.  So pressing RUN silently
 * rewrote the user's program:
 *   - continuation lines such as `A = [[1, 2, 3],` / `[4, 5, 6]]` were joined;
 *   - one-line compound statements were expanded onto extra lines;
 *   - `deque` support and generator-expression helpers were appended as
 *     `def _minipy_deque263...` / `def gxN(): ...` at the end of the program.
 *
 * Fix: give the interpreter its own source buffer (`Src267`).  Every list
 * reference inside the Interpreter target is re-pointed from `Code` to
 * `Src267`, and the RUN hat first copies `Code` into `Src267` with a warp
 * helper.  The editor keeps owning `Code`, so its content is never touched.
 *
 * Baseline: MiniPy_v4.266.sb3 (the first build that survives CCW upload).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { zipRead, zipWrite, makeBuilder } = require('../../sb3lib.js');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(ROOT, 'MiniPy_v4.266.sb3');
const EXPECTED = 'd7ed099cc0576a4a95bdb5db733b520334e9e9d54783be334b7502854d0e4f9f';
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'MiniPy_v4.267.sb3'));

const CODE_NAME = 'Code';
const CODE_ID = 'b=gLuC.Wb|2OD7W|%!We';
const SRC_NAME = 'Src267';
const SRC_ID = 'blist_src267a';
const IDX_NAME = 'srcI267';
const IDX_ID = 'bvar_src267i';
const MAP_NAME = 'SrcMap267';
const MAP_ID = 'blist_srcmap267';
const TMP_NAME = 'TmpMap267';
const TMP_ID = 'blist_tmpmap267';
const XGM_NAME = 'xgm267';
const XGM_ID = 'bvar_xgm267';
const COPY_PROC = 'srccopy267';
const RUN_HAT = 'IVYA[Yk.LVZTKW|OE`[p';

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if (sha(SRC) !== EXPECTED) throw new Error('Unexpected v4.266 baseline: ' + sha(SRC));
if (path.resolve(OUT) === path.resolve(SRC)) throw new Error('Refusing to overwrite the baseline');

const entries = zipRead(SRC);
const pj = entries.find((e) => e.name === 'project.json');
if (!pj) throw new Error('project.json missing');
const project = JSON.parse(pj.data.toString('utf8'));
const it = project.targets.find((t) => t.name === 'Interpreter');
if (!it) throw new Error('Interpreter target missing');

// ---------------------------------------------------------------- declarations
it.lists[SRC_ID] = [SRC_NAME, []];
it.variables[IDX_ID] = [IDX_NAME, 0];
// SrcMap267 lives on the stage so the TextRenderer can read it while drawing
// the "current line" marker (`pc` indexes Src267, not the editor's Code).
project.targets.find((t) => t.isStage).lists[MAP_ID] = [MAP_NAME, []];
it.lists[TMP_ID] = [TMP_NAME, []];
it.variables[XGM_ID] = [XGM_NAME, 0];

// ------------------------------------------- interpreter works on Src267 only
let moved = 0;
for (const b of Object.values(it.blocks)) {
  if (!b || typeof b !== 'object' || !b.fields) continue;
  const list = b.fields.LIST;
  if (Array.isArray(list) && list[0] === CODE_NAME && list[1] === CODE_ID) {
    b.fields.LIST = [SRC_NAME, SRC_ID];
    moved++;
  }
}
if (moved !== 153) throw new Error('expected 153 Code references in Interpreter, moved ' + moved);

// ------------------------------------------------------- warp copy helper
// Deterministic block ids / coordinates so rebuilding yields the same bytes.
let seed = 267;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const B = makeBuilder(project);
B.setCtx('Interpreter');
const { defId, protoId, argIds } = B.makeProcedure('Interpreter', COPY_PROC, [], true);
const num = (v) => [1, [4, String(v)]];
const txt = (v) => [1, [10, String(v)]];
const item = (listName, idx) => B.B('Interpreter', 'data_itemoflist', {
  fields: B.LISTF(listName), inputs: { INDEX: B.REP(idx, [4, '0']) }
});
const lenOf = (listName) => B.B('Interpreter', 'data_lengthoflist', { fields: B.LISTF(listName) });
const addTo = (listName, v) => B.B('Interpreter', 'data_addtolist', {
  fields: B.LISTF(listName), inputs: { ITEM: B.REP(v, [10, '']) }
});
const clear = (listName) => B.B('Interpreter', 'data_deletealloflist', { fields: B.LISTF(listName) });
const setV = (n, v) => B.B('Interpreter', 'data_setvariableto', {
  fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) }
});
const chgV = (n, v) => B.B('Interpreter', 'data_changevariableby', {
  fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) }
});
const gt = (a, b) => B.B('Interpreter', 'operator_gt', {
  inputs: { OPERAND1: B.REP(a, [10, '']), OPERAND2: B.REP(b, [10, '']) }
});
const mapItem = (idx) => B.B('Interpreter', 'data_itemoflist', {
  fields: B.LISTF(MAP_NAME), inputs: { INDEX: B.REP(idx, [4, '0']) }
});
const tmpPush = (idx) => {
  const itemId = mapItem(idx);
  const addId = B.B('Interpreter', 'data_addtolist', {
    fields: B.LISTF(TMP_NAME), inputs: { ITEM: B.REP(itemId, [10, '']) }
  });
  it.blocks[itemId].parent = addId;
  return addId;
};
const mapPush = (idx) => {
  const itemId = item(TMP_NAME, idx);
  const addId = addTo(MAP_NAME, itemId);
  it.blocks[itemId].parent = addId;
  return addId;
};
function insertAfter(afterId, newId) {
  const after = it.blocks[afterId];
  const block = it.blocks[newId];
  if (!after || !block) throw new Error('insertAfter: missing ' + afterId + '/' + newId);
  block.next = after.next;
  block.parent = after.parent;
  after.next = newId;
  return newId;
}

const body = [];
body.push(clear(SRC_NAME));
body.push(clear(MAP_NAME));
body.push(setV(IDX_NAME, num(1)));

const lenId = lenOf(CODE_NAME);
const condId = gt(B.VAR(IDX_NAME), lenId);
it.blocks[lenId].parent = condId;

const itemId = item(CODE_NAME, B.VAR(IDX_NAME));
const addId = addTo(SRC_NAME, itemId);
it.blocks[itemId].parent = addId;
const mapAddId = addTo(MAP_NAME, B.VAR(IDX_NAME));
const incId = chgV(IDX_NAME, num(1));
B.chain('Interpreter', [addId, mapAddId, incId]);

const loopId = B.B('Interpreter', 'control_repeat_until', {
  inputs: { CONDITION: B.BOOL(condId), SUBSTACK: B.BOOL(addId) }
});
it.blocks[condId].parent = loopId;
it.blocks[addId].parent = loopId;
it.blocks[mapAddId].parent = addId;
body.push(loopId);

const first = B.chain('Interpreter', body);
it.blocks[defId].next = first;
it.blocks[first].parent = defId;

// --------------------------------------------- call it at the start of RUN
const hat = it.blocks[RUN_HAT];
if (!hat || hat.opcode !== 'event_whenbroadcastreceived') throw new Error('RUN hat missing');
const oldFirst = hat.next;
const callId = B.callProc('Interpreter', COPY_PROC, argIds, [], true);
const call = it.blocks[callId];
call.parent = RUN_HAT;
call.next = oldFirst;
hat.next = callId;
if (!it.blocks[oldFirst]) throw new Error('RUN hat first block missing');

// ------------------- line map (Src267 line -> original editor Code line)
// The three source passes rewrite the line layout.  Rebuild a parallel map so
// the TextRenderer's "current line" marker still points at the user's line.
// splitlines: QNew / TmpMap267 -> Code / SrcMap267
insertAfter('bdatade_5zpcsvb2q', clear(TMP_NAME));
insertAfter('bdataad_61iohryfz', tmpPush(B.VAR('qidx')));
insertAfter('bdataad_61ulk1tv6', tmpPush(B.VAR('qidx')));
insertAfter('bdataad_627sp7iq8', tmpPush(B.VAR('qidx')));
insertAfter('bdatade_62cww0rve', clear(MAP_NAME));
insertAfter('bdataad_62hd5s1ao', mapPush(B.VAR('qidx')));
// joinlines: New2 / TmpMap267 -> Code / SrcMap267
insertAfter('bdatade_41svj8frc', clear(TMP_NAME));
const groupMapItem = mapItem(B.VAR('xgi'));
const groupMapSet = setV(XGM_NAME, groupMapItem);
it.blocks[groupMapItem].parent = groupMapSet;
insertAfter('bdatase_41xh1vh7m', groupMapSet);
insertAfter('bdataad_44chendsj', tmpPush(B.VAR(XGM_NAME)));
insertAfter('bdatade_44fzf2vi4', clear(MAP_NAME));
insertAfter('bdataad_44ktll0u5', mapPush(B.VAR('xgi')));
// expandlines: NewLines / TmpMap267 -> Code / SrcMap267
insertAfter('bdatade_3vfhbwp3q', clear(TMP_NAME));
insertAfter('bdataad_3yrq8ic79', tmpPush(B.VAR('xli')));
insertAfter('bdataad_3z13a8mpl', tmpPush(B.VAR('xli')));
insertAfter('bdataad_3z2s39nam', tmpPush(B.VAR('xli')));
insertAfter('bdatade_3z6wfshgd', clear(MAP_NAME));
insertAfter('bdataad_3zb0gpc72', mapPush(B.VAR('xli')));

// TextRenderer compares the drawn line against SrcMap267[pc] instead of pc.
const tr = project.targets.find((t) => t.name === 'TextRenderer');
const HILITE_EQ = 'DQ(-CDwxVGH5ERbfP1Kl';
const PC_ID = 'j*QhLn+]=t{6R+a`9w=N';
const trMapId = B.B('TextRenderer', 'data_itemoflist', {
  fields: { LIST: [MAP_NAME, MAP_ID] },
  inputs: { INDEX: [3, [12, 'pc', PC_ID], [10, '']] }
});
tr.blocks[trMapId].parent = HILITE_EQ;
if (tr.blocks[HILITE_EQ].opcode !== 'operator_equals')
  throw new Error('current-line marker block changed');
tr.blocks[HILITE_EQ].inputs.OPERAND2 = [3, trMapId, [10, '']];

// ------------------------------------------------------------------- validate
const leftover = [];
for (const [id, b] of Object.entries(it.blocks)) {
  if (!b || typeof b !== 'object' || !b.fields) continue;
  const list = b.fields.LIST;
  if (Array.isArray(list) && list[1] === CODE_ID) leftover.push(id);
}
// Only the two reads inside srccopy267 may still touch Code.
if (leftover.length !== 2) throw new Error('unexpected Code refs left in Interpreter: ' + leftover);
for (const id of leftover) {
  if (it.blocks[id].opcode !== 'data_lengthoflist' && it.blocks[id].opcode !== 'data_itemoflist')
    throw new Error('unexpected opcode reading Code: ' + it.blocks[id].opcode);
}

// Every block id referenced by next/parent/inputs must exist.
const ids = new Set(Object.keys(it.blocks));
for (const [id, b] of Object.entries(it.blocks)) {
  if (!b || typeof b !== 'object') continue;
  if (b.next && !ids.has(b.next)) throw new Error('dangling next in ' + id);
  if (b.parent && !ids.has(b.parent)) throw new Error('dangling parent in ' + id);
  for (const v of Object.values(b.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string' && !ids.has(v[1]))
      throw new Error('dangling input in ' + id);
  }
}

const json = JSON.stringify(project);
if (json.includes('\\b') || json.includes('\\u0008')) throw new Error('forbidden backspace sequence in output');
const outEntries = entries.map((e) => e.name === 'project.json'
  ? { name: e.name, data: Buffer.from(json, 'utf8') }
  : e);
zipWrite(outEntries, OUT);

const built = fs.readFileSync(OUT);
const blocks = Object.values(it.blocks).filter((b) => b && typeof b === 'object').length;
console.log(JSON.stringify({
  out: OUT,
  bytes: built.length,
  sha256: sha(OUT),
  projectJsonBytes: Buffer.byteLength(json),
  interpreterBlocks: blocks,
  movedCodeRefs: moved,
  leftoverCodeReads: leftover.length,
  copyProc: COPY_PROC
}, null, 2));
