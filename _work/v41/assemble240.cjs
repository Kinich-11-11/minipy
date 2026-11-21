// v4.240 = v4.239 manifest plus P758 (sort reverse state canonicalisation).
// Reuse the v4.237 assembly manifest (v4.237-era patches), then the repair chain.
const fs=require('fs'), path=require('path');
const dir=__dirname;
const src=fs.readFileSync(path.join(dir,'assemble237.cjs'),'utf8');
const base=fs.readFileSync(path.join(dir,'assemble230.cjs'),'utf8');
const parts=JSON.parse(base.match(/const parts=(\[[^\n]+\]);/)[1].replace(/'/g,'"'));
const extra=src.match(/parts\.splice\(parts\.indexOf\('tail.txt'\), 0, (.*)\);/)[1];
parts.splice(parts.indexOf('tail.txt'),0,...JSON.parse('['+extra.replace(/'/g,'"')+']'),'p749.txt','p750.txt','p751.txt','p752.txt','p753.txt','p754.txt','p756.txt','p757.txt','p758.txt');
if(new Set(parts).size!==parts.length)throw Error('duplicate parts');
const delta=process.argv.includes('--delta');
const selected=delta?['head.txt','p749.txt','p750.txt','p751.txt','p752.txt','p753.txt','p754.txt','p756.txt','p757.txt','p758.txt','tail.txt']:parts;
const code=selected.map(p=>{let s=fs.readFileSync(path.join(dir,p),'utf8').replace(/\r/g,'').trimEnd();
  if(p==='head.txt'){
    s=s.replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
      .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.240.sb3');")
      .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project240.json');")
      .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.240';");
    if(delta){s=s.slice(0,s.indexOf('// ---- P1:')).replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.239.sb3');");}
  }
  if(p==='p56.txt')s=s.replace(/^  const DIR = .*;$/m,"  const DIR = __dirname + '/';");
  return p==='tail.txt'?s.slice(s.indexOf('// ---- DEBUG')):s;
}).join('\n\n')+'\n';
new Function(code);fs.writeFileSync(path.join(dir,delta?'build240delta.js':'build240.js'),code);console.log('assembled '+selected.length+' parts');
