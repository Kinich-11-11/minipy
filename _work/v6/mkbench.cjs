'use strict';
// Builds a micro-benchmark project: one broadcast hat per primitive, each running
// LOOP times, so the harness can time a single primitive in isolation.
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite } = require('../sb3lib.js');
const { E, S, Emitter } = require('../v5/dsl.js');

const ROOT = 'D:/编程/scratch/ai/minipython';
const OUT = process.argv[2] || (ROOT + '/_work/v6/bench.sb3');
const LOOP = Number(process.argv[3] || 200000);

// tiny costume borrowed from an existing project (assets are optional headless)
const shell = zipRead(ROOT + '/MiniPy_v4.sb3');
const svg = shell.find((e) => e.name.endsWith('.svg'));
const md5 = svg.name.replace('.svg', '');

const project = {
  targets: [
    { isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
      currentCostume: 0, costumes: [{ name: 'backdrop1', dataFormat: 'svg', assetId: md5, md5ext: md5 + '.svg', rotationCenterX: 240, rotationCenterY: 180 }],
      sounds: [], volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null },
    { isStage: false, name: 'Bench', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
      currentCostume: 0, costumes: [{ name: 'c1', dataFormat: 'svg', assetId: md5, md5ext: md5 + '.svg', rotationCenterX: 0, rotationCenterY: 0 }],
      sounds: [], volume: 100, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around' },
  ],
  monitors: [], extensions: [], meta: { semver: '3.0.0', vm: '0.2.0', agent: 'primitive bench' },
};

const em = new Emitter(project);
em.addVar('Bench', 'x', 0);
em.addVar('Bench', 'n', 3);
em.addVar('Bench', 's', 'abc');
em.addVar('Bench', 'i', 3);
em.addList('Bench', 'L', [1, 2, 3, 4, 5]);
em.addList('Bench', 'M', []);

const cases = {
  set_const:    () => [S.set('x', E.num(1))],
  set_var:      () => [S.set('x', E.var('n'))],
  var_read_x3:  () => [S.set('x', E.add(E.var('n'), E.add(E.var('n'), E.var('n'))))],
  list_item_c:  () => [S.set('x', E.item('L', E.num(3)))],
  list_item_v:  () => [S.set('x', E.item('L', E.var('i')))],
  list_replace: () => [S.lset('L', E.var('i'), E.var('n'))],
  list_len:     () => [S.set('x', E.len('L'))],
  list_add:     () => [S.ladd('M', E.var('n'))],
  list_del:     () => [S.ldel('M', E.num(1))],
  eq_num:       () => [S.set('x', E.eq(E.var('n'), E.num(1)))],
  eq_str:       () => [S.set('x', E.eq(E.var('s'), E.str('abc')))],
  gt_num:       () => [S.set('x', E.gt(E.var('n'), E.num(0)))],
  join_str:     () => [S.set('x', E.join(E.var('s'), E.var('n')))],
  letter_of:    () => [S.set('x', E.letter(E.var('i'), E.var('s')))],
  len_str:      () => [S.set('x', E.slen(E.var('s')))],
  if_block:     () => [S.If(E.gt(E.var('n'), E.num(0)), [S.set('x', E.num(1))])],
  if_else:      () => [S.If(E.gt(E.var('n'), E.num(0)), [S.set('x', E.num(1))], [S.set('x', E.num(2))])],
  nested_if:    () => [S.If(E.gt(E.var('n'), E.num(0)), [S.If(E.lt(E.var('n'), E.num(9)), [S.set('x', E.num(1))])])],
  change_var:   () => [S.chg('n', E.num(0))],
  math_floor:   () => [S.set('x', E.math('floor', E.var('n')))],
};

for (const [name, body] of Object.entries(cases)) {
  em.addBroadcast('b_' + name);
  em.hat('Bench', 'event_whenbroadcastreceived', { BROADCAST_OPTION: 'b_' + name }, [
    S.Repeat(E.num(LOOP), body()),
  ]);
}
em.finish();
zipWrite([...shell.filter((e) => e.name !== 'project.json'), { name: 'project.json', data: Buffer.from(JSON.stringify(project), 'utf8') }], OUT);
console.log('built ' + OUT + ' with ' + Object.keys(cases).length + ' cases, loop=' + LOOP);
console.log(Object.keys(cases).join(','));