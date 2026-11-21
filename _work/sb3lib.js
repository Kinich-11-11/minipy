
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------- minimal ZIP ----------------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}
function zipWrite(entries, outPath) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const data = e.data;
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);   // UTF-8 flag
    local.writeUInt16LE(8, 8);        // deflate
    local.writeUInt16LE(0, 10);       // time
    local.writeUInt16LE(0x21, 12);    // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  fs.writeFileSync(outPath, Buffer.concat([...chunks, cdBuf, end]));
}
function zipRead(filePath) {
  const buf = fs.readFileSync(filePath);
  // find EOCD
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('bad central dir');
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    // local header
    const lnameLen = buf.readUInt16LE(localOff + 26);
    const lextraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lnameLen + lextraLen;
    const raw = buf.slice(dataStart, dataStart + compSize);
    const data = method === 0 ? raw : zlib.inflateRawSync(raw);
    entries.push({ name, data });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// ---------------- block builder ----------------
function makeBuilder(project) {
  let n = 0;
  const T = {};
  for (const t of project.targets) T[t.name] = t;
  const rnd = () => Math.random().toString(36).slice(2, 8);
  function nid(tag) { n++; return 'b' + tag + '_' + n.toString(36) + rnd(); }
  // register a block on a target
  function B(target, opcode, opts = {}) {
    const t = T[target];
    const id = opts.id || nid(opcode.replace(/[^a-z]/gi, '').slice(0, 6));
    const b = {
      opcode: opcode,
      next: null,
      parent: null,
      inputs: opts.inputs || {},
      fields: opts.fields || {},
      shadow: !!opts.shadow,
      topLevel: !!opts.topLevel
    };
    if (opts.mutation) b.mutation = opts.mutation;
    if (opts.topLevel) { b.x = opts.x === undefined ? 100 : opts.x; b.y = opts.y === undefined ? 100 : opts.y; }
    t.blocks[id] = b;
    return id;
  }
  // chain: set next/parent links for a list of block ids
  function chain(target, ids) {
    const t = T[target];
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i]) continue;
      if (i + 1 < ids.length) { t.blocks[ids[i]].next = ids[i + 1]; t.blocks[ids[i + 1]].parent = ids[i]; }
    }
    return ids[0];
  }
  // link a substack
  function sub(target, parentId, slot, firstId) {
    const t = T[target];
    t.blocks[parentId].inputs[slot] = [2, firstId];
    if (firstId) t.blocks[firstId].parent = parentId;
    return parentId;
  }
  function num(v) { return [1, [4, String(v)]]; }
  function txt(v) { return [1, [10, String(v)]]; }
  function listPrim(name) { return [1, [13, name, listIdOf(name)]]; }
  let ctx = null;   // {target}
  function setCtx(targetName) { ctx = targetName; }
  function varIdOf(name) {
    for (const t of [T[ctx], T['Stage']]) {
      for (const [id, v] of Object.entries(t.variables || {})) if (v[0] === name) return id;
    }
    throw new Error('no variable ' + name + ' in ' + ctx);
  }
  function listIdOf(name) {
    for (const t of [T[ctx], T['Stage']]) {
      for (const [id, v] of Object.entries(t.lists || {})) if (v[0] === name) return id;
    }
    throw new Error('no list ' + name + ' in ' + ctx);
  }
  function broadcastIdOf(name) {
    const t = T[ctx];
    for (const [id, v] of Object.entries(t.broadcasts)) if (v === name) return id;
    throw new Error('no broadcast ' + name);
  }
  function VAR(name) { return [3, [12, name, varIdOf(name)], [10, '']]; }
  function VARF(name) { return { VARIABLE: [name, varIdOf(name)] }; }
  function LISTF(name) { return { LIST: [name, listIdOf(name)] }; }
  // Accepts either a block id (string) or an already-built input descriptor.
  function REP(x, shadow) {
    if (typeof x !== 'string') return x;
    return [3, x, shadow || [10, '']];
  }
  function BOOL(x) {
    if (typeof x !== 'string') return x;
    return [2, x];
  }
  // ---- declarations ----
  function addVar(targetName, name, value) {
    for (const t of [T[targetName], T['Stage']]) {
      for (const [id, v] of Object.entries((t && t.variables) || {})) if (v[0] === name) return id;
    }
    const t = T[targetName];
    t.variables = t.variables || {};
    const id = nid('var');
    t.variables[id] = [name, value === undefined ? 0 : value];
    return id;
  }
  function addList(targetName, name, value) {
    for (const t of [T[targetName], T['Stage']]) {
      for (const [id, v] of Object.entries((t && t.lists) || {})) if (v[0] === name) return id;
    }
    const t = T[targetName];
    t.lists = t.lists || {};
    const id = nid('list');
    t.lists[id] = [name, value || []];
    return id;
  }
  function addBroadcast(targetName, name) {
    const t = T[targetName];
    t.broadcasts = t.broadcasts || {};
    const id = nid('bc');
    t.broadcasts[id] = name;
    return id;
  }
  // ---- custom blocks ----
  function makeProcedure(targetName, proccode, argNames, warp) {
    const t = T[targetName];
    const defId = nid('def');
    const protoId = nid('proto');
    const argIds = argNames.map(() => nid('arg'));
    const protoInputs = {};
    for (let i = 0; i < argNames.length; i++) {
      const repId = nid('argrep');
      t.blocks[repId] = {
        opcode: 'argument_reporter_string_number', next: null, parent: protoId,
        inputs: {}, fields: { VALUE: [argNames[i], null] }, shadow: true, topLevel: false
      };
      protoInputs[argIds[i]] = [1, repId];
    }
    t.blocks[protoId] = {
      opcode: 'procedures_prototype', next: null, parent: defId, inputs: protoInputs, fields: {},
      shadow: true, topLevel: false,
      mutation: {
        tagName: 'mutation', children: [], proccode: proccode,
        argumentids: JSON.stringify(argIds), argumentnames: JSON.stringify(argNames),
        argumentdefaults: JSON.stringify(argNames.map(() => '')), warp: warp ? 'true' : 'false'
      }
    };
    t.blocks[defId] = {
      opcode: 'procedures_definition', next: null, parent: null,
      inputs: { custom_block: [1, protoId] }, fields: {}, shadow: false, topLevel: true,
      x: 9000 + Math.floor(Math.random() * 500), y: 9000 + Math.floor(Math.random() * 500)
    };
    return { defId, protoId, argIds };
  }
  function argReporter(targetName, name) {
    return B(targetName, 'argument_reporter_string_number', { fields: { VALUE: [name, null] }, shadow: true });
  }
  function callProc(targetName, proccode, argIds, args, warp) {
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = REP(args[i], [4, '0']);
    return B(targetName, 'procedures_call', {
      inputs,
      mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: JSON.stringify(argIds), warp: warp ? 'true' : 'false' }
    });
  }
  return { T, B, chain, sub, num, txt, VAR, VARF, LISTF, REP, BOOL, setCtx, varIdOf, listIdOf, nid,
           addVar, addList, addBroadcast, makeProcedure, argReporter, callProc,
           get ctx() { return ctx; } };
}
module.exports = { zipWrite, zipRead, crc32, makeBuilder };