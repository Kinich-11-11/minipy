'use strict';
// A failed oracle timing is never a speed comparison. One VM per archive,
// warm all workloads first, then alternate AB/BA without profiling.
const fs = require('node:fs'), os = require('node:os');
const { session, oracle } = require('./run.cjs');
async function measure(a,b,out,n,workloads) {
  if (!a || !b || !out || !Number.isInteger(+n) || +n < 3) throw Error('expected before after report repeats>=3');
  const suite = workloads.map(c=>({...c,expected:oracle(c)}));
  const report = {
    node: process.version, zlib: process.versions.zlib,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0].model,
    method: 'one initialized VM per archive; untimed warmup of every workload; alternating AB/BA rounds, no profiling',
    samples: [],
  };
  const sessions = {};
  try {
    for (const [key,file] of [['before',a],['after',b]]) {
      sessions[key]=await session(file);
      for (const c of suite) sessions[key].run(c,c.expected);
    }
    for (let i=0;i<+n;i++) {
      for (const key of i%2?['after','before']:['before','after']) {
        const s=sessions[key];
        const samples=suite.map(c=>{
          const r=s.run(c,c.expected);
          if (!r.state.finished || !r.state.sourceIntact || (key==='after'&&!r.pass)) throw Error(`${key}: ${c.name}`);
          return {name:c.name,ms:r.ms,pass:r.pass};
        });
        report.samples.push({key,round:i+1,sha256:s.sha256,samples});
      }
    }
  } finally {
    for (const s of Object.values(sessions)) s.vm.quit();
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  }
}
function cli(workloads) {
  const [a,b,out,n='5']=process.argv.slice(2);
  console.log=console.warn=()=>{};
  measure(a,b,out,n,workloads).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(2)});
}
module.exports={measure,cli};
