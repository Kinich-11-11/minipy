// Portable differential runner. Default isolated; --shared exercises consecutive RUN hats.
// npm install scratch-vm; node runrepair.mjs project.sb3 suite.txt [name-regexp]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const VM = require(process.env.MINIPY_VM || 'scratch-vm');
const args = process.argv.slice(2);
const shared = args.includes('--shared');
const extraSuites=[], positional=[];
let knownPath;
for(let i=0;i<args.length;i++){
  if(args[i]==='--shared')continue;
  if(args[i]==='--suite'){if(!args[i+1])throw Error('--suite requires a path');extraSuites.push(args[++i]);}
  else if(args[i]==='--known-differences'){if(!args[i+1])throw Error('--known-differences requires a path');knownPath=args[++i];}
  else positional.push(args[i]);
}
const [project, suite, pattern = '.*'] = positional;
const source = fs.readFileSync(project);
const cases = [suite,...extraSuites].flatMap(file=>{
  const input=fs.readFileSync(file,'utf8');
  return (file.endsWith('.json') ? JSON.parse(input) : input.replace(/\r/g, '').split(/^### /m).slice(1).map(s => {
    const i = s.indexOf('\n'); return { name: s.slice(0,i).trim().replace(/^!/, ''), code: s.slice(i+1).trimEnd() };
  })).map(c=>({...c,suite:file}));
}).filter(c => new RegExp(pattern).test(c.name));
const known=knownPath?JSON.parse(fs.readFileSync(knownPath,'utf8')):{};
const maxMs = Number(process.env.MINIPY_MAX_MS || 20000), maxSteps = Number(process.env.MINIPY_MAX_STEPS || 4000);
let failed = 0, declared = 0;
let vm;
const vals = m => m && typeof m.values === 'function' ? [...m.values()] : Object.values(m || {});
const normalize = s => s.replace(/\r?\n/g,'').replace(/0x[\da-fA-F]+/g,'0xADDR');
const exceptionType = s => String(s || '').trim().split('\n').at(-1)?.match(/^(?:[\w.]+\.)?([A-Za-z_]\w*)(?::|$)/)?.[1];
if (!cases.length) throw new Error('No matching cases');
for (const c of cases) {
  const py = spawnSync(process.env.PYEXE || 'python3', ['-c', c.code], { encoding:'utf8', timeout:20000, input:(c.inputs||[]).join('\n')+'\n', env:{...process.env,PYTHONHASHSEED:process.env.PYTHONHASHSEED || '0'} });
  if (py.error || py.signal) throw new Error('CPython failed: ' + (py.error || py.signal));
  const fresh = !vm;
  if (fresh) { vm = new VM(); await vm.loadProject(source); }
  const r = vm.runtime, stage = r.getTargetForStage();
  const interp = r.targets.find(t => t.getName() === 'Interpreter');
  const variables = () => [...vals(stage.variables), ...vals(interp?.variables)];
  const varOf = n => variables().find(v => v.name === n && v.type !== 'list');
  const listOf = n => variables().find(v => v.name === n && v.type === 'list');
  const set = (n,v) => { varOf(n).value = v; };
  const get = n => varOf(n)?.value;
  if (fresh) { if(process.env.MINIPY_TURBO==='1')vm.setTurboMode(true); vm.start(); vm.greenFlag(); for(let i=0;i<30;i++) r._step(); }
  listOf('Code').value = c.code.split('\n');
  for (const [n,v] of Object.entries({ mode:0, ticket:(Number(get('ticket'))||0)+1, stopreq:0, running:1, speed:1, error:'' })) set(n,v);
  r.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  const start=Date.now(); let steps=0;
  const answers=(c.inputs||[]).slice();
  let lastAnswer=null, waitSteps=0;
  while (steps++ < maxSteps && Date.now()-start < maxMs) {
    // Since P607, RUN-mode input polls the stdin variable. ANSWER alone
    // can be emitted before the UI's asynchronous ask enters the queue.
    if(String(get('status'))==='Waiting for input') {
      if(answers.length && (!varOf('stdin') || String(get('stdin'))==='')) {
        lastAnswer=answers.shift();waitSteps=0;
        if(varOf('stdin'))set('stdin',lastAnswer);else r.emit('ANSWER',lastAnswer);
      } else if(lastAnswer!==null && ++waitSteps>3) {r.emit('ANSWER',lastAnswer);waitSteps=0;}
    }
    r._step(); if (steps>3 && Number(get('running'))===0) break;
  }
  const output=listOf('Output').value.map(String), error=String(get('error')||'');
  const norm=normalize;
  const actual=norm(output.join('')), expected=norm(py.stdout||'');
  const pyError=exceptionType(py.stderr);
  const miniError=exceptionType(error);
  const completed=Number(get('running'))===0;
  // Scratch's Output includes rendered error diagnostics, unlike CPython
  // stdout. Remove only the exact trailing Line N diagnostic, not user data.
  const diagnostic=norm(error);
  const beforeError=diagnostic && actual.endsWith(diagnostic)
    ? actual.slice(0,-diagnostic.length).replace(/Line \d+: $/,'')
    : actual;
  const pass=completed && (c.expectedError ? error.includes(c.expectedError) && (c.outputIncludes||[]).every(s=>actual.includes(norm(s))) : py.status===0 ? !error && actual===expected : !!pyError && miniError===pyError && beforeError===expected);
  const boundary=Object.prototype.hasOwnProperty.call(known,c.name)?known[c.name]:null;
  const knownDifference=!pass&&completed&&boundary&&boundary.pyerror===(pyError||null)&&boundary.error===error&&expected===''&&beforeError==='';
  if(knownDifference) declared++;
  else if(!pass) failed++;
  console.log(JSON.stringify({name:c.name,suite:c.suite,pass,status:pass?'pass':knownDifference?'known-difference':'fail',mode:shared?'shared':'isolated',completed,ms:Date.now()-start,steps,executed:get('steps'),pc:get('pc'),actual:output,expected:py.stdout,error,pyerror:pyError,minierror:miniError,trace:listOf('Trace')?.value, gh: Object.fromEntries(['GHInject783','GHSuspPc783','GHyfOn','GHyfL','GHyfG','GHdead','GHStarted','GHRecvMode','TryHand','TryEnd','TryName','TryLoop','TryC','ExActiveId','ExActiveStart','ExActiveEnd','ExActiveDepth','ExActiveMsg','error'].map(n=>[n,varOf(n)?.value ?? listOf(n)?.value]))}));
  if (!shared || !completed) { vm.quit(); vm=undefined; }
}
if (vm) vm.quit();
console.log(`${cases.length-failed-declared}/${cases.length} passed${declared?' ; '+declared+' known differences':''}`);
process.exit(failed?1:0);


