'use strict';
// Stage 02 is cumulative on stage 01, still built from the locked core.
// Compare the exact ordered rows without changing any frozen oracle.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {compare}=require('../tests/compare.cjs');
const dir=path.join(__dirname,'../reports'), prev=path.join(dir,'upgrade-stage-01'), stage=path.join(dir,'upgrade-stage-02');
const load=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name+'.json')));
const previous=load(prev,'summary'), lock=require('../core-lock.json');
assert.equal(previous.before,lock.sha256);
const frozen=require('../baseline.json').sha256,before=previous.after,after=load(stage,'build').sha256;
const check=(folder,name,sha)=>{
  const x=load(folder,name);
  assert.equal(x.sha256,sha,'incompatible report '+name);
  assert(x.runs.every(r=>r.state.finished&&r.state.sourceIntact&&Object.values(r.state.frames).every(n=>n===0)),'state '+name);
  return x;
};
const group=(r,name)=>({...r,runs:r.runs.filter(x=>x.group===name)});
const sameEnv=(a,b)=>{
  for(const key of ['node','python','vmFileSha256']) assert.equal(a[key],b[key],key);
  return compare(a,b);
};
const scopes={};
for(const [key,a,b] of [
  ['mainObjectsAliases','dictviews-candidate-main','stage02-main'],
  ['coverage','dictviews-candidate-coverage','stage02-coverage'],
  ['archiveApps','dictviews-candidate-extended','stage02-extended'],
  ['archiveRest','dictviews-candidate-rest','stage02-rest'],
  ['dictviews','dictviews-candidate','stage02-dictviews'],
]) scopes[key]=sameEnv(check(prev,a,before),check(stage,b,after));
const controls=check(stage,'stage02-boundaries',after);
scopes.dictviewsBoundaries=sameEnv(check(prev,'dictviews-boundaries-candidate',before),group(controls,'dictviews-boundaries'));
scopes.reconstructedAscii=sameEnv(check(prev,'ascii-recovered-candidate',before),group(controls,'ascii'));
const prior=check(stage,'nestedrefs-stage01',before), current=check(stage,'nestedrefs-stage02',after), v4=check(stage,'nestedrefs-v4',frozen);
const nested={};
for(const name of ['nestedrefs','nestedrefs-history','nestedrefs-boundaries']){
  scopes[name]=sameEnv(group(prior,name),group(current,name));
  const rows=group(v4,name).runs;
  nested[name]={v4:{passed:rows.filter(x=>x.pass).length,total:rows.length}};
}
const pathStats=r=>{
  const rows=r.runs.filter(x=>x.pathState);
  return {total:rows.length,depthFailures:rows.filter(x=>x.pathState.depth!==0).length,stackFailures:rows.filter(x=>x.pathState.stack!==0).length,temporaryFailures:rows.filter(x=>x.pathState.temporaries.length!==0).length};
};
const historical=Object.values(scopes).slice(0,4), count=k=>historical.reduce((s,x)=>s+x[k],0);
const historicalSummary={total:count('total'),beforePassed:count('baselinePassed'),afterPassed:count('candidatePassed'),fixes:historical.flatMap(x=>x.fixes),regressions:historical.flatMap(x=>x.regressions)};
const triage=load(prev,'live-diff-triage'), fixed=new Set(historicalSummary.fixes);
assert.equal(triage.candidate,before);
const rows=triage.rows.map(r=>fixed.has(r.name)?{...r,disposition:'fixed in stage 02 candidate; confirmed by frozen oracle'}:r);
const summary={frozen,locked:lock.sha256,before,after,comparisonScope:'stage 01 versus stage 02, same local toolchain and ordered historical rows; targeted three-way runs separate',historical:historicalSummary,scopes,nested,pathState:{frozen:pathStats(v4),before:pathStats(prior),after:pathStats(current)},corePromoted:false};
fs.writeFileSync(path.join(stage,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(stage,'live-diff-triage.json'),JSON.stringify({sourceCore:lock.sha256,previousCandidate:before,candidate:after,rows},null,2)+'\n');
console.log(JSON.stringify(historicalSummary,null,2));
process.exitCode=Number(Object.values(scopes).some(x=>x.regressions.length));
