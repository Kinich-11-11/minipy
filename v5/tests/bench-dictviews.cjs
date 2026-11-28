'use strict';
const {cases}=require('./run.cjs');
const {cli}=require('./stage-benchmark.cjs');
const selection=new Set(['view-repr-direct','view-items-comp','view-list-still-works']);
cli([...cases('dictviews').filter(c=>selection.has(c.name)),
  {name:'arithmetic-control',code:'s=0\nfor i in range(30): s+=i\nprint(s)'}]);
