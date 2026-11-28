'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const delta = require('./ascii-fused.graph.json');
const hash = (blocks) => createHash('sha256').update(JSON.stringify(blocks)).digest('hex');

// Archival recovery of the omitted migration module from the checked-in,
// SHA-locked core: exact ordered graph delta relative to the first eight
// migrations. Do not apply it to an already migrated core. Future tokenizer
// changes should use an independent semantic Graph patch instead.
module.exports = {
  id: 'ascii-fused',
  after: ['state'],
  writes: ['tokenizer.ascii'],
  apply(p) {
    const blocks = p.targets.find((t) => t.name === 'Interpreter').blocks;
    assert.equal(hash(blocks), delta.before, 'unexpected pre-ASCII graph');
    for (const key of delta.removed) delete blocks[key];
    for (const [key, block] of Object.entries(delta.changed)) {
      assert(Object.hasOwn(blocks, key), `missing changed block ${key}`);
      blocks[key] = structuredClone(block);
    }
    for (const [key, block] of Object.entries(delta.added)) {
      assert(!Object.hasOwn(blocks, key), `duplicate recovered block ${key}`);
      blocks[key] = structuredClone(block);
    }
    assert.equal(hash(blocks), delta.after, 'recovered graph mismatch');
    return { recovered: true, removedBlocks: delta.removed.length, addedBlocks: Object.keys(delta.added).length, changedBlocks: Object.keys(delta.changed).length };
  },
};
