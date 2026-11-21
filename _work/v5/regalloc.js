'use strict';
/**
 * v5 register allocator - build post-pass over the emitted project.
 *
 * Goal (plan section 10): the Interpreter should not carry one Scratch variable per
 * semantic name.  Every procedure is a leaf and every script is independent, so a
 * variable that only one top-level script touches is a *per-script local* and two such
 * locals may share one physical Scratch variable whenever their "region" sets are
 * disjoint.  A region is a script root or an If/loop body subtree; by construction a
 * variable that is never referenced inside a region cannot have its value read there,
 * so sharing is safe.
 *
 * A local that can be read before it is ever written is excluded: such a variable
 * depends on its declared initial value, which a shared slot cannot guarantee.
 */
function optimize(project, opts) {
  const o = opts || {};
  const tgt = project.targets.find((t) => t.name === 'Interpreter');
  if (!tgt) return { skipped: true };
  const blocks = tgt.blocks;
  const varsDict = tgt.variables || {};
  const NEWLINE = String.fromCharCode(10);

  // ---------- 1. script + region of every block (iterative: chains get long) ----------
  const scriptOf = Object.create(null);
  const regParent = Object.create(null);
  const regDepth = Object.create(null);
  // depth-independent LCA: mark b's ancestor path, then walk a up to the first marked node.
  // (an earlier depth-clamping version returned non-ancestors, which let the allocator pool
  //  variables whose live ranges actually overlap).
  function lca(a, b) {
    const anc = new Set();
    for (let x = b; x !== undefined && x !== null; x = regParent[x]) anc.add(x);
    let x = a;
    while (x !== undefined && x !== null && !anc.has(x)) x = regParent[x];
    if (x === undefined || x === null) x = scriptRootOf(a);
    return x;
  }
  function scriptRootOf(r) {
    let x = r, guard = 0;
    while (x !== undefined && regParent[x] !== undefined && guard++ < 10000) x = regParent[x];
    return x;
  }
  const regionOf = Object.create(null);
  // project.json has no parent_input (that is scratch-vm runtime state), so the tree is
  // walked forward from every top-level script: the input key tells us whether a child
  // opens a new region (a body subtree) or belongs to the enclosing region.
  function walkTree(startId, reg, scr) {
    let cur = startId;
    let guard = 0;
    while (cur && guard++ < 200000) {
      if (regionOf[cur] !== undefined) break;
      regionOf[cur] = reg; scriptOf[cur] = scr;
      const b = blocks[cur];
      if (!b) break;
      const ins = b.inputs || {};
      for (const k in ins) {
        const v = ins[k];
        if (!v || typeof v[1] !== 'string') continue;
        const childReg = (k === 'SUBSTACK' || k === 'SUBSTACK2') ? v[1] : reg;
        if (childReg !== reg && regParent[childReg] === undefined) { regParent[childReg] = reg; regDepth[childReg] = (regDepth[reg] || 0) + 1; }
        walkTree(v[1], childReg, scr);
      }
      cur = b.next;
    }
  }
  for (const id in blocks) if (blocks[id].topLevel) walkTree(id, id, id);

  // ---------- 2. definite assignment: flag variables read before any write ----------
  const rwFlag = Object.create(null);
  const LOOPY = { control_repeat: 1, control_repeat_until: 1, control_forever: 1, control_while: 1 };
  function note(f, state) {
    if (!f) return;
    const id = f[1];
    if (!varsDict[id]) return;
    if (!state.has(id)) rwFlag[id] = true;
  }
  function walkExpr(id, state) {
    const b = blocks[id];
    if (!b) return;
    if (b.opcode === 'data_variable') { note(b.fields.VARIABLE, state); return; }
    const ins = b.inputs || {};
    for (const k in ins) { const v = ins[k]; if (v && typeof v[1] === 'string') walkExpr(v[1], state); }
  }
  function walkStmt(startId, stateIn) {
    let state = stateIn;
    let cur = startId;
    let guard = 0;
    while (cur && guard++ < 200000) {
      const b = blocks[cur];
      if (!b) break;
      const ins = b.inputs || {};
      for (const k in ins) {
        if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
        const v = ins[k];
        if (v && typeof v[1] === 'string') walkExpr(v[1], state);
      }
      const op = b.opcode;
      if (op === 'data_setvariableto') {
        if (b.fields.VARIABLE) state = new Set(state).add(b.fields.VARIABLE[1]);
      } else if (op === 'data_changevariableby') {
        note(b.fields.VARIABLE, state);
        if (b.fields.VARIABLE) state = new Set(state).add(b.fields.VARIABLE[1]);
      } else if (op === 'data_variable') {
        note(b.fields.VARIABLE, state);
      } else if (op === 'control_if' || op === 'control_if_else') {
        const a = ins.SUBSTACK && ins.SUBSTACK[1];
        const c = ins.SUBSTACK2 && ins.SUBSTACK2[1];
        const s1 = new Set(state);
        const s2 = new Set(state);
        if (typeof a === 'string') walkStmt(a, s1);
        if (typeof c === 'string') walkStmt(c, s2);
        const both = new Set();
        for (const x of s1) if (s2.has(x)) both.add(x);
        state = both;
      } else if (LOOPY[op]) {
        const body = ins.SUBSTACK && ins.SUBSTACK[1];
        if (typeof body === 'string') {
          for (let pass = 0; pass < 2; pass++) {
            const s = new Set(state);
            walkStmt(body, s);
            for (const x of s) state.add(x);
          }
        }
      }
      cur = b.next;
    }
  }
  const topScripts = [];
  for (const id in blocks) if (blocks[id].topLevel && scriptOf[id] === id) topScripts.push(id);
  for (const s of topScripts) walkStmt(s, new Set());

  // ---------- 3. classify ----------
  const varScripts = Object.create(null);
  for (const id in blocks) {
    const f = blocks[id].fields;
    if (!f || !f.VARIABLE || !varsDict[f.VARIABLE[1]]) continue;
    const s = scriptOf[id];
    (varScripts[f.VARIABLE[1]] || (varScripts[f.VARIABLE[1]] = new Set())).add(s);
  }
  const referenced = Object.keys(varScripts);
  const assign = Object.create(null);   // old var id -> new var id
  const newVars = Object.create(null);  // new var id -> [name, value]
  let pooledCount = 0, slotCount = 0, pinnedCount = 0, rwCount = 0;

  // cross-script variables cannot be pooled (scripts interleave at yield points) and are
  // kept on their own slot for now.
  for (const v of referenced) {
    if (varScripts[v].size > 1) { assign[v] = v; newVars[v] = [varsDict[v][0], varsDict[v][1]]; pinnedCount++; }
  }
  // ---------- 3b. live ranges + linear scan ----------
  // Colouring one web per *variable name* left vm_run with 145 registers even though only a
  // handful of values are live at any point.  Each variable is now split into def-use webs
  // by walking the script's structured block order, and webs are coloured by overlap.
  const order = Object.create(null);
  const seqOf = Object.create(null);
  const subEnd = Object.create(null);   // last linear index of a block's input subtrees
  function linearize(id, seq) {
    let cur = id, guard = 0;
    while (cur && guard++ < 500000) {
      if (order[cur] !== undefined) break;
      order[cur] = seq.length; seq.push(cur);
      const b = blocks[cur]; if (!b) break;
      let last = order[cur];
      const ins = b.inputs || {};
      for (const k in ins) {
        const vv = ins[k];
        if (!vv || typeof vv[1] !== 'string' || !blocks[vv[1]]) continue;
        linearize(vv[1], seq);
        if (subEnd[vv[1]] > last) last = subEnd[vv[1]];
      }
      subEnd[cur] = last;
      cur = b.next;
    }
  }
  for (const s of topScripts) { const seq = []; linearize(s, seq); seqOf[s] = seq; }
  const procScript = Object.create(null);
  const procByCode = Object.create(null);
  for (const s of topScripts) {
    const b = blocks[s];
    procScript[s] = !!b && b.opcode === 'procedures_definition';
    if (procScript[s]) {
      const proto = b.inputs && b.inputs.custom_block && blocks[b.inputs.custom_block[1]];
      const pc = proto && proto.mutation && proto.mutation.proccode;
      if (pc) procByCode[pc] = s;
    }
  }
  // leaf procedures never call each other, so the ones reached from a single hat can share
  // one register pool; a procedure called from several hats gets a pool of its own.
  const poolKeyOf = Object.create(null);
  const hatCalls = Object.create(null);
  for (const s of topScripts) {
    if (procScript[s]) continue;
    for (const bid of seqOf[s]) {
      const b = blocks[bid];
      if (b.opcode !== 'procedures_call' || !b.mutation) continue;
      const target = procByCode[b.mutation.proccode];
      if (!target) continue;
      (hatCalls[target] || (hatCalls[target] = new Set())).add(s);
    }
  }
  for (const s of topScripts) {
    if (!procScript[s]) continue;
    const hats = hatCalls[s];
    poolKeyOf[s] = process.env.V5_NOPOOL ? s : ((hats && hats.size === 1) ? [...hats][0] : s);
  }
  const LOOPOPS = { control_repeat: 1, control_repeat_until: 1, control_while: 1, control_forever: 1 };
  const loopsOf = Object.create(null);
  for (const s of topScripts) {
    const arr = [];
    for (const bid of seqOf[s]) {
      const b = blocks[bid];
      if (!LOOPOPS[b.opcode]) continue;
      const i = order[bid];
      const lEnd = subEnd[bid] === undefined ? i : subEnd[bid];
      let bodyStart = lEnd + 1;
      const ins = b.inputs || {};
      for (const k in ins) {
        if (k !== 'SUBSTACK' && k !== 'SUBSTACK2') continue;
        const c = ins[k] && ins[k][1];
        if (typeof c === 'string' && order[c] !== undefined && order[c] < bodyStart) bodyStart = order[c];
      }
      arr.push([i, lEnd, bodyStart - 1]);
    }
    loopsOf[s] = arr;
  }
  const assignAt = Object.create(null);
  for (const s of topScripts) {
    const seq = seqOf[s];
    const sites = Object.create(null);
    for (let i = 0; i < seq.length; i++) {
      const b = blocks[seq[i]], f = b.fields;
      if (!f || !f.VARIABLE || !varsDict[f.VARIABLE[1]]) continue;
      const v = f.VARIABLE[1];
      if (varScripts[v].size !== 1) continue;
      const kind = b.opcode === 'data_setvariableto' ? 'w' : 'r';
      (sites[v] || (sites[v] = [])).push([i, kind, seq[i]]);
    }
    const locals = referenced.filter((v) => varScripts[v].size === 1 && varScripts[v].has(s));
    const webs = [];
    const pinnedHere = [];
    for (const v of locals) {
      if (rwFlag[v]) { pinnedHere.push(v); continue; }
      const ss = sites[v];
      if (!ss || !ss.length || ss[0][1] !== 'w') { pinnedHere.push(v); continue; }
      // Splitting at a def is only valid inside one region.  Across a branch or a loop
      // body the same register must serve every def that can reach a later use (an
      // if/else pair both feed the code after the If; a loop body feeds the next
      // iteration's condition), so those variables collapse into a single web.
      const regs = new Set();
      for (const site of ss) regs.add(regionOf[site[2]]);
      const vwebs = [];
      if (regs.size === 1 && !process.env.V5_NOSPLIT) {
        let cur = null;
        for (const [i, kind, bid] of ss) {
          if (kind === 'w') { cur = { v: v, start: i, end: i, ids: [bid], sites: [i] }; vwebs.push(cur); }
          else { cur.end = i; cur.ids.push(bid); cur.sites.push(i); }
        }
      } else {
        const w = { v: v, start: ss[0][0], end: ss[ss.length - 1][0], ids: [], sites: [] };
        for (const site of ss) { w.ids.push(site[2]); w.sites.push(site[0]); }
        vwebs.push(w);
      }
      for (const w of vwebs) webs.push(w);
    }
    for (const v of pinnedHere) {
      rwCount++;
      const nid = 'v5p' + (pinnedCount++);
      assign[v] = nid; newVars[nid] = [varsDict[v][0], varsDict[v][1]];
    }
    // A value read in a loop condition (or live before the loop) must survive the back
    // edge, so its interval is stretched over the whole loop; otherwise a temp inside the
    // body would be free to reuse the same register between two iterations.
    const loopsHere = loopsOf[s] || [];
    if (loopsHere.length && !process.env.V5_NOLEXT) {
      let changed = true, lg = 0;
      while (changed && lg++ < 10) {
        changed = false;
        for (const w of webs) {
          for (const lp of loopsHere) {
            const li = lp[0], lEnd = lp[1], hEnd = lp[2];
            let inLoop = false, before = false, header = false;
            for (const x of w.sites) {
              if (x >= li && x <= lEnd) inLoop = true;
              if (x < li) before = true;
              if (x >= li && x <= hEnd) header = true;
            }
            if (inLoop && (before || header) && w.end < lEnd) { w.end = lEnd; changed = true; if (process.env.V5_REGSTAT) console.log('   extend ' + w.v + ' -> ' + lEnd + ' (hdr=' + header + ' before=' + before + ')'); }
          }
        }
      }
    }
    webs.sort((a, b) => a.start - b.start);
    const active = [];
    if (process.env.V5_OLDCOLOR) {
      // legacy region rule: two variables may share a slot only when their regions sit in
      // disjoint subtrees (comparable regions always conflict)
      const webOf = Object.create(null), chainOf = Object.create(null);
      for (const w of webs) {
        let web = null;
        for (const bid of w.ids) { const r = regionOf[bid]; web = (web === null) ? r : (web === r ? web : lca(web, r)); }
        webOf[w.v] = web;
        const chain = new Set();
        for (let r = web; r !== undefined && r !== null; r = regParent[r]) chain.add(r);
        chainOf[w.v] = chain;
      }
      const order2 = webs.slice().sort((a, b) => chainOf[b.v].size - chainOf[a.v].size);
      const color2 = Object.create(null);
      for (const w of order2) {
        const taken = new Set();
        for (const u in color2) {
          if (chainOf[u].has(webOf[w.v]) || chainOf[w.v].has(webOf[u])) taken.add(color2[u]);
        }
        let c = 0; while (taken.has(c)) c++;
        color2[w.v] = c;
        const nid = procScript[s] ? ('v5q' + poolKeyOf[s] + '_' + c) : ('v5s' + s + '_' + c);
        if (!newVars[nid]) newVars[nid] = procScript[s] ? ['v5regP' + c, varsDict[w.v][1]] : ['v5reg' + slotCount++, varsDict[w.v][1]];
        for (const bid of w.ids) assignAt[bid] = nid;
        pooledCount++;
      }
      continue;
    }
    // Region of every web (LCA of its sites) plus its ancestor chain.  Two webs may share a
    // register when their regions sit in disjoint subtrees (they can never both be live), or
    // when they sit in the same region and their intervals do not overlap (that spine runs in
    // block order).  Comparable-but-different regions always conflict: a value inside a loop
    // body would otherwise steal the register of one that is live across the back edge.
    for (const w of webs) {
      let wr = null;
      for (const bid of w.ids) { const r = regionOf[bid]; wr = (wr === null) ? r : (wr === r ? wr : lca(wr, r)); }
      w.reg = wr;
      w.chain = new Set();
      for (let r = wr; r !== undefined && r !== null; r = regParent[r]) w.chain.add(r);
    }
    const placed = [];
    for (const w of webs) {
      const taken = new Set();
      for (const q of placed) {
        if (!(q.chain.has(w.reg) || w.chain.has(q.reg))) continue;
        const overlap = !(q.end < w.start || w.end < q.start);
        if (q.reg !== w.reg || overlap) taken.add(q.color);
      }
      let c = 0; while (taken.has(c)) c++;
      w.color = c;
      placed.push(w);
      const nid = procScript[s] ? ('v5q' + poolKeyOf[s] + '_' + c) : ('v5s' + s + '_' + c);
      if (!newVars[nid]) {
        newVars[nid] = procScript[s] ? ['v5regP' + c, varsDict[w.v][1]] : ['v5reg' + slotCount++, varsDict[w.v][1]];
      }
      for (const bid of w.ids) assignAt[bid] = nid;
      pooledCount++;
    }
    if (process.env.V5_REGSTAT) console.log('  script ' + s + (procScript[s] ? ' [proc]' : ' [hat]') + ' locals=' + locals.length + ' pinned=' + pinnedHere.length + ' webs=' + webs.length + ' colors=' + (placed.reduce((mx, w) => Math.max(mx, w.color + 1), 0)));
  }
  // ---------- 4. rewrite ----------
  // §10: the Interpreter should keep only a handful of Scratch variables.  Registers are
  // ranked by how many blocks touch them; the hottest KEEP stay real variables and every
  // other one moves into a slot of the `Reg` list.  A slot belongs to exactly one web, so
  // this cannot alias anything - and it is what the plan asks for: state in lists, not in
  // sprite variables.
  const useCount = Object.create(null);
  for (const id in blocks) {
    const f = blocks[id].fields;
    if (!f || !f.VARIABLE) continue;
    const nv = assignAt[id] || assign[f.VARIABLE[1]];
    if (nv) useCount[nv] = (useCount[nv] || 0) + 1;
  }
  // Target: 150-200 Scratch variables (only the coldest registers are pushed into the
  // list, so the cost is negligible).  V5_KEEPVARS overrides the cap.
  const KEEP = Math.max(0, Number(process.env.V5_KEEPVARS || 180));
  const ranked = Object.keys(newVars).sort((a, b) => (useCount[b] || 0) - (useCount[a] || 0));
  const slotOf = Object.create(null);
  let spilled = 0;
  for (let i = KEEP; i < ranked.length; i++) slotOf[ranked[i]] = spilled++;
  const REGLIST = 'Reg', REGID = 'v5reglist';
  const numIn = (n) => [1, [4, String(n)]];
  let nextId = 0;
  const freshId = () => 'v5spill' + (nextId++);
  let rewrites = 0, spilledRefs = 0;
  for (const id in blocks) {
    const b = blocks[id], f = b.fields;
    if (!f || !f.VARIABLE) continue;
    const nid = assignAt[id] || assign[f.VARIABLE[1]];
    if (!nid) continue;
    const slot = slotOf[nid];
    if (slot === undefined) {
      if (newVars[nid]) f.VARIABLE = [newVars[nid][0], nid];
      rewrites++;
      continue;
    }
    if (b.opcode === 'data_variable') {
      b.opcode = 'data_itemoflist';
      b.fields = { LIST: [REGLIST, REGID] };
      b.inputs = { INDEX: numIn(slot + 1) };
      spilledRefs++;
    } else if (b.opcode === 'data_setvariableto') {
      const val = b.inputs.VALUE;
      b.opcode = 'data_replaceitemoflist';
      b.fields = { LIST: [REGLIST, REGID] };
      b.inputs = { INDEX: numIn(slot + 1), ITEM: val };
      spilledRefs++;
    } else if (b.opcode === 'data_changevariableby') {
      const val = b.inputs.VALUE;
      const itemId = freshId(), addId = freshId();
      blocks[itemId] = { opcode: 'data_itemoflist', next: null, parent: addId, shadow: false, topLevel: false,
        fields: { LIST: [REGLIST, REGID] }, inputs: { INDEX: numIn(slot + 1) } };
      blocks[addId] = { opcode: 'operator_add', next: null, parent: id, shadow: false, topLevel: false,
        fields: {}, inputs: { NUM1: [3, itemId, [10, '']], NUM2: val } };
      if (Array.isArray(val) && typeof val[1] === 'string' && blocks[val[1]]) blocks[val[1]].parent = addId;
      b.opcode = 'data_replaceitemoflist';
      b.fields = { LIST: [REGLIST, REGID] };
      b.inputs = { INDEX: numIn(slot + 1), ITEM: [3, addId, [10, '']] };
      spilledRefs++;
    } else {
      // anything else (show/hide) keeps its variable
      delete slotOf[nid];
      if (newVars[nid]) f.VARIABLE = [newVars[nid][0], nid];
    }
    rewrites++;
  }
  if (!o.dryRun && spilled) {
    tgt.lists = tgt.lists || {};
    tgt.lists[REGID] = [REGLIST, new Array(spilled).fill('')];
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
    keptVars: KEEP,
    spilled: spilled,
    spilledRefs: spilledRefs,
    pooled: pooledCount,
    slots: slotCount,
    pinned: pinnedCount,
    readBeforeWrite: rwCount,
    scripts: topScripts.length,
    rewrites: rewrites,
  };
}
module.exports = { optimize };
