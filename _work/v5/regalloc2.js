'use strict';
/**
 * v5 register allocator - build post-pass over the emitted project (plan section 10).
 *
 * Every kernel procedure is a leaf and every top-level script is independent, so a Scratch
 * variable that only one script touches is a per-script local.  Locals are then packed:
 *
 * 1. SPLIT.  A local's references are grouped by "top-level group" (the script spine, or a
 *    direct child region of the spine - in the VM that is one opcode handler).  If *every*
 *    group writes the variable before reading it, the groups are mutually independent and
 *    the variable may be split into one unit per group.
 * 2. PACK.  A unit's *web* is the smallest region containing all of its references.  Two
 *    units whose webs are in disjoint subtrees can never have overlapping live ranges, so
 *    they share one physical Scratch variable.  Comparable webs always interfere.
 *
 * Anything that cannot be packed (cross-script state, or a unit read before it is written
 * and therefore dependent on its declared initial value) keeps its own variable.
 */
function optimize(project, opts) {
  const o = opts || {};
  const tgt = project.targets.find((t) => t.name === 'Interpreter');
  if (!tgt) return { skipped: true };
  const blocks = tgt.blocks;
  const varsDict = tgt.variables || {};

  // ---------- 1. script tree + region tree (forward walk: project.json has no parent_input) ----------
  const scriptOf = Object.create(null);
  const regionOf = Object.create(null);
  const regParent = Object.create(null);
  const regDepth = Object.create(null);
  const groupRoots = Object.create(null);   // script -> array of group region ids (spine first)
  const scriptRoots = [];
  function walkTree(startId, reg, scr) {
    let cur = startId;
    let guard = 0;
    while (cur && guard++ < 400000) {
      if (regionOf[cur] !== undefined) break;
      regionOf[cur] = reg; scriptOf[cur] = scr;
      const b = blocks[cur];
      if (!b) break;
      const ins = b.inputs || {};
      for (const k in ins) {
        const v = ins[k];
        if (!v || typeof v[1] !== 'string') continue;
        const isBody = (k === 'SUBSTACK' || k === 'SUBSTACK2');
        const childReg = isBody ? v[1] : reg;
        if (isBody && regParent[childReg] === undefined) {
          regParent[childReg] = reg;
          regDepth[childReg] = (regDepth[reg] || 0) + 1;
          (groupRoots[scr] || (groupRoots[scr] = [])).push(childReg);
        }
        walkTree(v[1], childReg, scr);
      }
      cur = b.next;
    }
  }
  for (const id in blocks) {
    if (blocks[id].topLevel) { scriptRoots.push(id); walkTree(id, id, id); }
  }
  for (const s of scriptRoots) (groupRoots[s] || (groupRoots[s] = [])).unshift(s);
  function topGroup(regionId, scr) {
    let r = regionId;
    if (r === scr) return scr;
    while (regParent[r] !== undefined && regParent[r] !== scr) r = regParent[r];
    return r;
  }
  function lca(a, b) {
    let x = a, y = b;
    while ((regDepth[x] || 0) > (regDepth[y] || 0)) x = regParent[x];
    while ((regDepth[y] || 0) > (regDepth[x] || 0)) y = regParent[y];
    while (x !== y) { x = regParent[x]; y = regParent[y]; }
    return x;
  }

  // ---------- 2. per-group definite assignment ----------
  const LOOPY = { control_repeat: 1, control_repeat_until: 1, control_forever: 1, control_while: 1 };
  const groupInfo = Object.create(null);   // groupRegionId -> { refs:Set, bad:Set }
  function analyzeGroup(rootId) {
    const refs = new Set();
    const bad = new Set();
    function expr(id, st) {
      const b = blocks[id];
      if (!b) return;
      const f = b.fields;
      if (b.opcode === 'data_variable' && f && f.VARIABLE && varsDict[f.VARIABLE[1]]) {
        const v = f.VARIABLE[1];
        refs.add(v);
        if (!st.has(v)) bad.add(v);
        return;
      }
      const ins = b.inputs || {};
      for (const k in ins) { const v = ins[k]; if (v && typeof v[1] === 'string') expr(v[1], st); }
    }
    function stmt(startId, stIn) {
      let st = stIn;
      let cur = startId;
      let guard = 0;
      while (cur && guard++ < 400000) {
        const b = blocks[cur];
        if (!b) break;
        const ins = b.inputs || {};
        for (const k in ins) {
          if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
          const v = ins[k];
          if (v && typeof v[1] === 'string') expr(v[1], st);
        }
        const op = b.opcode;
        const f = b.fields;
        if (op === 'data_setvariableto' && f && f.VARIABLE && varsDict[f.VARIABLE[1]]) {
          refs.add(f.VARIABLE[1]);
          st = new Set(st).add(f.VARIABLE[1]);
        } else if (op === 'data_changevariableby' && f && f.VARIABLE && varsDict[f.VARIABLE[1]]) {
          const v = f.VARIABLE[1];
          refs.add(v);
          if (!st.has(v)) bad.add(v);
          st = new Set(st).add(v);
        } else if (op === 'data_variable' && f && f.VARIABLE && varsDict[f.VARIABLE[1]]) {
          const v = f.VARIABLE[1];
          refs.add(v);
          if (!st.has(v)) bad.add(v);
        } else if (op === 'control_if' || op === 'control_if_else') {
          const a = ins.SUBSTACK && ins.SUBSTACK[1];
          const c = ins.SUBSTACK2 && ins.SUBSTACK2[1];
          const s1 = new Set(st), s2 = new Set(st);
          if (typeof a === 'string') stmt(a, s1);
          if (typeof c === 'string') stmt(c, s2);
          const both = new Set();
          for (const x of s1) if (s2.has(x)) both.add(x);
          st = both;
        } else if (LOOPY[op]) {
          const body = ins.SUBSTACK && ins.SUBSTACK[1];
          if (typeof body === 'string') {
            for (let pass = 0; pass < 2; pass++) {
              const s = new Set(st);
              stmt(body, s);
              for (const x of s) st.add(x);
            }
          }
        }
        cur = b.next;
      }
    }
    stmt(rootId, new Set());
    groupInfo[rootId] = { refs, bad };
  }
  for (const s of scriptRoots) for (const g of groupRoots[s]) analyzeGroup(g);

  // ---------- 3. units ----------
  // unit = { var, blocks:[ids], group }
  const refBlocks = Object.create(null);   // varId -> [blockIds]
  const varScripts = Object.create(null);
  for (const id in blocks) {
    const f = blocks[id].fields;
    if (!f || !f.VARIABLE || !varsDict[f.VARIABLE[1]]) continue;
    const v = f.VARIABLE[1];
    (refBlocks[v] || (refBlocks[v] = [])).push(id);
    (varScripts[v] || (varScripts[v] = new Set())).add(scriptOf[id]);
  }
  const units = [];
  let splitVars = 0;
  for (const v of Object.keys(refBlocks)) {
    if (varScripts[v].size !== 1) continue;   // cross-script -> pinned below
    const scr = [...varScripts[v]][0];
    const byGroup = Object.create(null);
    for (const id of refBlocks[v]) {
      const g = topGroup(regionOf[id], scr);
      (byGroup[g] || (byGroup[g] = [])).push(id);
    }
    const gs = Object.keys(byGroup);
    let allSelfContained = true;
    for (const g of gs) {
      const info = groupInfo[g];
      if (!info || info.bad.has(v)) { allSelfContained = false; break; }
    }
    if (gs.length > 1 && allSelfContained) splitVars++;
    if (gs.length > 1 && !allSelfContained) {
      units.push({ var: v, blocks: refBlocks[v].slice(), group: null, poolable: false, scr });
    } else {
      for (const g of gs) {
        units.push({ var: v, blocks: byGroup[g], group: g, poolable: allSelfContained, scr });
      }
    }
  }

  // ---------- 4. pack ----------
  const assign = Object.create(null);   // blockId -> new var id
  const newVars = Object.create(null);
  let slotCount = 0, pooledUnits = 0, pinnedUnits = 0;
  function pin(unit, name, value) {
    const nid = 'v5pin' + (slotCount++);
    newVars[nid] = [name, value];
    for (const id of unit.blocks) assign[id] = nid;
    pinnedUnits++;
  }
  // cross-script variables keep their own slot
  for (const v of Object.keys(refBlocks)) {
    if (varScripts[v].size === 1) continue;
    pin({ blocks: refBlocks[v] }, varsDict[v][0], varsDict[v][1]);
  }
  for (const s of scriptRoots) {
    const mine = units.filter((u) => u.scr === s);
    // non-poolable units keep their own slot, with the declared initial value
    for (const u of mine) {
      if (!u.poolable) pin(u, varsDict[u.var][0], varsDict[u.var][1]);
    }
    // web of each poolable unit
    const live = mine.filter((u) => u.poolable);
    for (const u of live) {
      let web = null;
      for (const id of u.blocks) {
        const r = regionOf[id];
        web = web === null ? r : (web === r ? web : lca(web, r));
      }
      u.web = web;
      const chain = new Set();
      for (let r = web; r !== undefined && r !== null; r = regParent[r]) chain.add(r);
      u.chain = chain;
    }
    const order = live.slice().sort((a, b) => b.chain.size - a.chain.size);
    const color = Object.create(null);
    let used = 0;
    for (const u of order) {
      const taken = new Set();
      for (const w of order) {
        if (w === u || w.color === undefined) continue;
        if (w.chain.has(u.web) || u.chain.has(w.web)) taken.add(w.color);
      }
      let c = 0;
      while (taken.has(c)) c++;
      u.color = c;
      if (c + 1 > used) used = c + 1;
    }
    const slotId = [];
    for (let c = 0; c < used; c++) {
      const nid = 'v5reg' + slotCount++;
      newVars[nid] = ['v5reg' + c, 0];
      slotId.push(nid);
    }
    for (const u of live) {
      const nid = slotId[u.color];
      for (const id of u.blocks) assign[id] = nid;
      pooledUnits++;
    }
  }

  // ---------- 5. rewrite ----------
  let rewrites = 0;
  for (const id in blocks) {
    const f = blocks[id].fields;
    if (!f || !f.VARIABLE) continue;
    const nid = assign[id];
    if (!nid) continue;
    f.VARIABLE = [newVars[nid][0], nid];
    rewrites++;
  }
  if (!o.dryRun) {
    const kept = Object.create(null);
    for (const id in blocks) {
      const f = blocks[id].fields;
      if (f && f.VARIABLE && newVars[f.VARIABLE[1]]) kept[f.VARIABLE[1]] = newVars[f.VARIABLE[1]];
    }
    tgt.variables = kept;
  }
  return {
    before: Object.keys(varsDict).length,
    after: Object.keys(newVars).length,
    units: units.length,
    splitVars,
    pooledUnits, pinnedUnits, rewrites,
  };
}
module.exports = { optimize };
