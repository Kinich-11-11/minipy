'use strict';
/**
 * Shell (Controller) fixes that build5.js copies verbatim from MiniPy_v4.sb3.
 * Run against a built .sb3; rewrites project.json in place.
 *
 *   1. startRun's "already running" branch bumped `ticket`, which nothing reads,
 *      so clicking RUN/STEP mid-run did nothing at all. Make it a real restart:
 *      stopreq + HALT, then fall through to a normal start.
 *   2. STEP (sm=1) must not be swallowed while a program sits parked: the
 *      Interpreter decides resume-vs-restart from `stepgo`, so STEP always
 *      needs to reach the RUN broadcast.
 *
 *   node _work/v6/patch_shell.cjs <sb3>
 */
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite } = require(path.join(__dirname, '../sb3lib.js'));

const target = process.argv[2];
if (!target) { console.log('usage: patch_shell.cjs <sb3>'); process.exit(1); }

const entries = zipRead(target);
const pjEntry = entries.find((e) => e.name === 'project.json');
const project = JSON.parse(pjEntry.data.toString('utf8'));
const C = project.targets.find((t) => t.name === 'Controller');
const B = C.blocks;

// locate startRun
let root = null;
for (const [id, b] of Object.entries(B)) {
  if (b.opcode === 'procedures_definition') {
    const proto = B[b.inputs.custom_block[1]];
    if (proto && proto.mutation && /^startRun/.test(proto.mutation.proccode)) root = id;
  }
}
if (!root) { console.log('MISS startRun'); process.exit(1); }

const outerIf = B[root].next;                 // if busy == 0
const innerIf = B[outerIf].inputs.SUBSTACK[1]; // if running == 0 ... else ...
if (B[innerIf].opcode !== 'control_if_else') { console.log('MISS inner if_else'); process.exit(1); }

const elseHead = B[innerIf].inputs.SUBSTACK2 && B[innerIf].inputs.SUBSTACK2[1];
if (!elseHead) { console.log('MISS else branch'); process.exit(1); }

// --- find the stopreq/running/RUN template blocks in the THEN branch so the new
// --- blocks copy their exact shapes (broadcast input needs the message id).
const thenHead = B[innerIf].inputs.SUBSTACK[1];
let tSet = null, tBroadcast = null;
for (let cur = thenHead; cur; cur = B[cur].next) {
  if (B[cur].opcode === 'data_setvariableto' && B[cur].fields.VARIABLE[0] === 'stopreq') tSet = cur;
  if (B[cur].opcode === 'event_broadcast') tBroadcast = cur;
}
if (!tSet || !tBroadcast) { console.log('MISS templates'); process.exit(1); }
const stopreqField = B[tSet].fields.VARIABLE.slice();
const runningTpl = (() => {
  for (let cur = thenHead; cur; cur = B[cur].next) {
    if (B[cur].opcode === 'data_setvariableto' && B[cur].fields.VARIABLE[0] === 'running') return B[cur].fields.VARIABLE.slice();
  }
  return null;
})();
const bcastInput = JSON.parse(JSON.stringify(B[tBroadcast].inputs.BROADCAST_INPUT));

// find the HALT message id from the Controller's own HALT broadcast, if present
let haltInput = null;
for (const b of Object.values(B)) {
  if (b.opcode === 'event_broadcast' && b.inputs.BROADCAST_INPUT &&
      Array.isArray(b.inputs.BROADCAST_INPUT[1]) && b.inputs.BROADCAST_INPUT[1][1] === 'HALT') {
    haltInput = JSON.parse(JSON.stringify(b.inputs.BROADCAST_INPUT));
  }
}
if (!haltInput) { console.log('MISS HALT broadcast template'); process.exit(1); }

let n = 0;
const nid = () => 'fix' + (++n).toString(36) + 'shl';

// Build the replacement else-body:
//   set stopreq = 1        (ask the running program to stop)
//   broadcast HALT         (Interpreter stops its scripts, clears stepgo)
//   set stopreq = 0
//   set running = 1
//   broadcast RUN          (fresh start; mode was already set by the caller)
const mk = (id, opcode, fields, inputs, next) => {
  B[id] = { opcode, next: next || null, parent: null, inputs: inputs || {}, fields: fields || {}, shadow: false, topLevel: false };
};
const idStop1 = nid(), idHalt = nid(), idStop0 = nid(), idRun1 = nid(), idBcast = nid();
mk(idStop1, 'data_setvariableto', { VARIABLE: stopreqField }, { VALUE: [1, [4, '1']] }, idHalt);
// broadcast-AND-WAIT: plain broadcast is fire-and-forget, so the HALT hat's
// `running = 0 / busy = 0` would land AFTER the `running = 1` below and kill the
// restart we just asked for. Waiting lets HALT fully settle first.
mk(idHalt, 'event_broadcastandwait', {}, { BROADCAST_INPUT: haltInput }, idStop0);
mk(idStop0, 'data_setvariableto', { VARIABLE: stopreqField }, { VALUE: [1, [4, '0']] }, idRun1);
mk(idRun1, 'data_setvariableto', { VARIABLE: runningTpl }, { VALUE: [1, [4, '1']] }, idBcast);
mk(idBcast, 'event_broadcast', {}, { BROADCAST_INPUT: bcastInput }, null);

// keep the original `set mode = <arg>` at the head of the else branch (it records
// RUN vs STEP for the Interpreter), then splice the restart sequence after it.
let keepHead = elseHead, tail = elseHead;
for (let cur = elseHead; cur; cur = B[cur].next) {
  if (B[cur].opcode === 'data_setvariableto' && B[cur].fields.VARIABLE[0] === 'mode') { tail = cur; break; }
}
// drop everything after `set mode` (the dead `ticket += 1`) and attach the restart
let drop = B[tail].next;
while (drop) { const nx = B[drop].next; delete B[drop]; drop = nx; }
B[tail].next = idStop1;
B[idStop1].parent = tail;
B[idHalt].parent = idStop1;
B[idStop0].parent = idHalt;
B[idRun1].parent = idStop0;
B[idBcast].parent = idRun1;
B[keepHead].parent = innerIf;

pjEntry.data = Buffer.from(JSON.stringify(project), 'utf8');
zipWrite(entries, target);
console.log('ok: startRun else-branch now restarts instead of bumping a dead ticket');
console.log('    added ' + n + ' blocks to Controller');
