'use strict';
/**
 * MiniPy v5 builder.  Shell (Stage / Controller / TextRenderer) is taken from
 * MiniPy_v4.sb3; the Interpreter target is wiped and rebuilt from the kernel
 * sources in ./kernel.
 */
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite } = require('../sb3lib.js');
const { E, S, Emitter } = require('./dsl.js');
const K = require('./kernel/index.js');

const ROOT = 'D:/编程/scratch/ai/minipython';
const SRC = ROOT + '/MiniPy_v4.sb3';
const OUT = process.env.V5_OUT || (ROOT + '/MiniPy_v5.sb3');
const OUT_JSON = ROOT + '/_work/build/v5_project.json';

// ---------- shell variables / lists that stay ----------
const KEEP_STAGE_VARS = ['busy','demo','dirty','error','hscroll','mode','outpage','page',
  'pc','running','selected','speed','status','steps','stopreq','ticket','varpage'];
const KEEP_STAGE_LISTS = ['Code','Output','Names','Values','Types','Export','Snapshot'];

function load() {
  const entries = zipRead(SRC);
  const pj = entries.find((e) => e.name === 'project.json');
  const project = JSON.parse(pj.data.toString('utf8'));
  return { entries, project, pj };
}

function isReferenced(project, kind, name) {
  for (const t of project.targets) {
    for (const id in t.blocks || {}) {
      const f = t.blocks[id].fields || {};
      if (kind === 'var' && f.VARIABLE && f.VARIABLE[0] === name) return true;
      if (kind === 'list' && f.LIST && f.LIST[0] === name) return true;
    }
  }
  return false;
}

function pruneStageDecls(project) {
  const stage = project.targets.find((t) => t.name === 'Stage');
  const removedV = [], removedL = [];
  for (const [id, v] of Object.entries(stage.variables || {})) {
    if (!KEEP_STAGE_VARS.includes(v[0]) && !isReferenced(project, 'var', v[0])) {
      delete stage.variables[id]; removedV.push(v[0]);
    }
  }
  for (const [id, v] of Object.entries(stage.lists || {})) {
    if (!KEEP_STAGE_LISTS.includes(v[0]) && !isReferenced(project, 'list', v[0])) {
      delete stage.lists[id]; removedL.push(v[0]);
    }
  }
  return { removedV, removedL };
}

async function main() {
  const { entries, project, pj } = load();
  const em = new Emitter(project);

  em.dropTarget('Interpreter');
  const pruned = pruneStageDecls(project);
  console.log('[shell] dropped stage vars:', pruned.removedV.join(', ') || '(none)');
  console.log('[shell] dropped stage lists:', pruned.removedL.join(', ') || '(none)');

  K.build(em, project);
  em.finish();

  // ---- shrink the Interpreter's Scratch-variable count (plan section 10) ----
  if (!process.env.V5_NOREG) {
    const st = require('./regalloc.js').optimize(project);
    console.log('[regalloc] vars ' + st.before + ' -> ' + st.after + ' (pooled ' + st.pooled +
      ' locals into ' + st.slots + ' slots; pinned ' + st.pinned + ', of which read-before-write ' +
      st.readBeforeWrite + '; ' + st.rewrites + ' references rewritten)')
  }

  // ---- write ----
  const out = entries.map((e) => e.name === 'project.json'
    ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') }
    : e);
  zipWrite(out, OUT);
  fs.writeFileSync(OUT_JSON, JSON.stringify(project));

  // ---- report ----
  let total = 0;
  for (const t of project.targets) {
    const nb = Object.keys(t.blocks || {}).length;
    total += nb;
    const nv = Object.keys(t.variables || {}).length;
    const nl = Object.keys(t.lists || {}).length;
    console.log('  ' + t.name.padEnd(14) + ' blocks=' + String(nb).padStart(5) +
      ' vars=' + String(nv).padStart(3) + ' lists=' + String(nl).padStart(3));
  }
  if (em.autoVars && em.autoVars.length) {
    console.log('[build] auto-declared scratch vars: ' + [...new Set(em.autoVars)].join(', '));
  }
  console.log('[build] total blocks = ' + total + ' -> ' + OUT);
}

main();
