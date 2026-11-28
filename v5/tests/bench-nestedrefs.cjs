'use strict';
const {cases}=require('./run.cjs');
const {cli}=require('./stage-benchmark.cjs');
const selection=new Set(['matrix-repeat','named-child-direct-and-followup','equal-distinct-rows']);
const names=Array.from({length:12},(_,i)=>'row'+i);
cli([...cases('nestedrefs').filter(c=>selection.has(c.name)),
  {name:'distinct-rows-12',pathBalance:true,code:`m=[${names.map(()=>'[0]').join(',')}]\nm[3][0]=4\nprint(m[3],m[4])`},
  {name:'named-refs-12',pathBalance:true,code:`${names.map(n=>`${n}=[0]`).join('\n')}\nm=[${names.join(',')}]\nm[8][0]=7\nprint(m[8],row8,row7)`},
  {name:'arithmetic-control',code:'s=0\nfor i in range(30): s+=i\nprint(s)'}]);
