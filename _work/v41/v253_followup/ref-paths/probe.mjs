import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const vmPath = '../../../vm5300/node_modules/scratch-vm';
const VM = require(vmPath);
const version = require(`${vmPath}/package.json`).version;
const project = fs.readFileSync(new URL('../../MiniPy_v4.252.sb3', import.meta.url));
const selection = process.argv[2] || '.*';
const trace = process.argv.includes('--trace');
const formal = JSON.parse(fs.readFileSync(new URL('../n-cases.json', import.meta.url), 'utf8'))
  .filter(c => /^N10[67]$/.test(c.name));
const klass = 'class A:\n    def __init__(self):\n        self.d = {"a":1}\na = A()\n';
const make = 'def f():\n    d = {"a":1}\n    return d,d.items()\n';
const cases = [...formal,
  {name:'attr-direct-reread',code:klass+'k = a.d.keys()\na.d["b"] = 2\nprint(list(a.d.keys()),list(k))'},
  {name:'attr-read-twice',code:klass+'k = a.d.keys()\na.d["b"] = 2\nj = a.d.keys()\na.d["c"] = 3\nprint(list(k),list(j))'},
  {name:'attr-set-rebind',code:klass+'k = a.d.keys()\na.d = {"b":2}\na.d["c"] = 3\nprint(list(k),list(a.d.keys()))'},
  {name:'attr-alias-var',code:klass+'d = a.d\nk = d.keys()\na.d["b"] = 2\nprint(list(d.keys()),list(k))'},
  {name:'attr-alias-instance',code:klass+'b = a\nk = a.d.keys()\nb.d["b"] = 2\nprint(list(k),list(a.d.keys()))'},
  {name:'attr-assign-shared',code:klass+'d = {"z":3}\na.d = d\nk = a.d.keys()\nd["b"] = 2\nprint(list(k),list(a.d.keys()))'},
  {name:'attr-two-instances',code:klass+'b = A()\nk = a.d.keys()\nj = b.d.keys()\na.d["b"] = 2\nprint(list(k),list(j))'},
  {name:'attr-setattr-getattr',code:klass+'d = {"z":3}\nsetattr(a,"d",d)\nk = getattr(a,"d").keys()\nd["b"] = 2\nprint(list(k),list(a.d.keys()))'},
  {name:'tuple-local-unpack',code:'d = {"a":1}\np = (d,d.items())\nx,i = p\nx["a"] = 7\nprint(list(i),d["a"])'},
  {name:'tuple-parenthesized',code:make.replace('return d,d.items()', 'return (d,d.items())')+'d,i = f()\nd["a"] = 7\nprint(list(i))'},
  {name:'tuple-index',code:make+'t = f()\nx = t[0]\ni = t[1]\nx["a"] = 7\nprint(list(i))'},
  {name:'tuple-dest-rebind',code:'d = {"x":2}\nk = d.keys()\n'+make+'d,i = f()\nd["b"] = 7\nprint(list(k),list(i))'},
  {name:'tuple-two-equal-calls',code:make+'x,i = f()\ny,j = f()\nx["a"] = 7\nprint(list(i),list(j))'},
  {name:'tuple-double-dict',code:make.replace('return d,d.items()','return d,d,d.items()')+'x,y,i = f()\nx["a"] = 7\nprint(y["a"],list(i))'},
  {name:'tuple-mutate-before-return',code:make.replace('return d,d.items()', 'v = d.items()\n    d["a"] = 3\n    return d,v')+'d,i = f()\nprint(list(i))\nd["a"] = 7\nprint(list(i))'},
  {name:'tuple-reverse-order',code:make.replace('return d,d.items()', 'return d.items(),d')+'i,d = f()\nd["a"] = 7\nprint(list(i))'},
  {name:'tuple-reused-unpack',code:make+'t = f()\nx,i = t\nx["a"] = 7\ny,j = t\nprint(y["a"],list(j))'},
  {name:'return-direct-owner-control',code:'d = {"a":1}\nk = d.items()\ndef f():\n    return d\nx = f()\nx["a"] = 7\nprint(list(k))'},
  {name:'name-alias-rebind-control',code:'d = {"a":1}\nk = d.items()\nx = d\nd = {"b":2}\nx["a"] = 7\nprint(list(k),list(d))'},
];
console.log(JSON.stringify({version, sha256:createHash('sha256').update(project).digest('hex')}));
const valMap = m => Object.values(m);
const seenLists = /^(IAttr|RefKeys826$|RefIds826$|RefData826$)/;
const calls = /^(ref(?:Find|Get|Link)826|view826|aset|attrfind|attrBuiltin781|pathset|palwrite|methodcall|dictmeth|tuplelit|listitem|unpackto|fpop|calluser|dictlit|assign|aldrop|alset|indexset)( |$)/;
for (const {name, code} of cases.filter(c => new RegExp(selection).test(c.name))) {
  const py = spawnSync(process.env.PYEXE || 'python', ['-c', code], {encoding:'utf8'});
  if (py.status !== 0) throw Error(py.error || py.stderr);
  const vm = new VM();
  const r = vm.runtime;
  let timeToTrace = false;
  const events = [];
  const prim = r._primitives;
  const procs = prim.procedures_call;
  let vmap;
  const get = n => vmap[n]?.value;
  const state = () => [get('pc'),get('FrGen')?.length,get('evtype'),get('ev'),get('evK')];
  if (trace) for (const opcode of ['procedures_call','data_addtolist','data_replaceitemoflist','data_deleteoflist']) {
    const original = prim[opcode];
    prim[opcode] = (args, util) => {
      if (timeToTrace && opcode === 'procedures_call') {
        const proc = args.mutation.proccode;
        if (!util.stackFrame.executed && calls.test(proc)) {
          const [names, ids] = util.getProcedureParamNamesIdsAndDefaults(proc);
          const params = Object.fromEntries(names.map((n,i) => [n,args[ids[i]]]));
          events.push(['call',util.thread.peekStack(),proc,params,state()]);
        }
      } else if (timeToTrace && seenLists.test(args.LIST?.name)) {
        const list = get(args.LIST.name);
        const before = list.slice();
        const ret = original(args,util);
        events.push([opcode,util.thread.peekStack(),args.LIST.name,before,list.slice(),state()]);
        return ret;
      }
      return original(args,util);
    };
  }
  await vm.loadProject(project);
  const stage = r.getTargetForStage(), it = r.targets.find(t=>t.getName()==='Interpreter');
  vmap = Object.fromEntries([...valMap(it.variables),...valMap(stage.variables)].map(v=>[v.name,v]));
  vm.start(); vm.greenFlag(); for(let i=0;i<30;i++) r._step();
  Object.assign(vmap.Code,{value:code.split('\n')});
  for (const [n,v] of Object.entries({mode:0,ticket:(Number(get('ticket'))||0)+1,stopreq:0,running:1,speed:1,error:''})) vmap[n].value=v;
  timeToTrace = true;
  r.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  let step = 0, start = Date.now();
  while (step++ < 4000 && Date.now()-start < 20000) { r._step(); if(step>3 && Number(get('running'))===0) break; }
  const actual = get('Output').slice(), expected = py.stdout.replace(/\r/g,'').trimEnd().split('\n');
  const finished = Number(get('running'))===0, error = String(get('error')||'');
  const refs = Object.fromEntries(['RefKeys826','RefIds826','RefData826',...Object.keys(vmap).filter(k=>/^IAttr/.test(k))].map(n=>[n,get(n)]));
  console.log(JSON.stringify({name,pass:finished&&!error&&actual.join('')===expected.join(''),finished,actual,expected,error,refs}));
  if (trace) for (const e of events) console.log(JSON.stringify(e));
  vm.quit();
}
