// Portable, isolated differential runner for repair suites.
// npm install scratch-vm; node runrepair.mjs project.sb3 suite.txt [name-regexp]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const VM = require(process.env.MINIPY_VM || 'scratch-vm');
const [project, suite, pattern = '.*'] = process.argv.slice(2);
const source = fs.readFileSync(project);
const input = fs.readFileSync(suite, 'utf8');
const cases = (suite.endsWith('.json') ? JSON.parse(input) : input.replace(/\r/g, '').split(/^### /m).slice(1).map(s => {
  const i = s.indexOf('\n'); return { name: s.slice(0,i).trim(), code: s.slice(i+1).trimEnd() };
})).filter(c => new RegExp(pattern).test(c.name));
const maxMs = Number(process.env.MINIPY_MAX_MS || 20000), maxSteps = Number(process.env.MINIPY_MAX_STEPS || 4000);
let failed = 0;
for (const c of cases) {
  const py = spawnSync(process.env.PYEXE || 'python3', ['-c', c.code], { encoding:'utf8', timeout:20000, input:(c.inputs||[]).join('\n')+'\n' });
  const vm = new VM(); await vm.loadProject(source);
  const r = vm.runtime, stage = r.getTargetForStage();
  const interp = r.targets.find(t => t.getName() === 'Interpreter');
  const variables = () => [...Object.values(stage.variables), ...Object.values(interp.variables)];
  const varOf = n => variables().find(v => v.name === n && v.type !== 'list');
  const listOf = n => variables().find(v => v.name === n && v.type === 'list');
  const set = (n,v) => { varOf(n).value = v; };
  const get = n => varOf(n)?.value;
  vm.start(); vm.greenFlag(); for(let i=0;i<30;i++) r._step();
  listOf('Code').value = c.code.split('\n');
  for (const [n,v] of Object.entries({ mode:0, ticket:1, stopreq:0, running:1, speed:1, error:'' })) set(n,v);
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
  const norm=s=>s.replace(/\r?\n/g,'').replace(/0x[\da-fA-F]+/g,'0xADDR');
  const actual=norm(output.join('')), expected=norm(py.stdout||'');
  const pyError=String(py.stderr||'').trim().split('\n').at(-1)?.match(/^(\w+Error|\w+Exception):/);
  const pass=Number(get('running'))===0 && (c.expectedError ? error.includes(c.expectedError) && (c.outputIncludes||[]).every(s=>actual.includes(norm(s))) : py.status===0 ? !error && actual===expected : !!pyError && error.includes(pyError[1]));
  if(!pass) failed++;
  console.log(JSON.stringify({name:c.name,pass,ms:Date.now()-start,steps,executed:get('steps'),pc:get('pc'),actual:output,expected:py.stdout,error,pyerror:pyError?.[1]}));
  vm.quit();
}
console.log(`${cases.length-failed}/${cases.length} passed`);
process.exit(failed?1:0);
