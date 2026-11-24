// Build from the published v4.252 archive (not an experimental candidate).
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module');
const work=path.dirname(__dirname),root=path.resolve(work,'../..'),src=path.join(root,'MiniPy_v4.252.sb3');
const out=path.resolve(process.argv[2]||path.join(root,'MiniPy_v4.253.sb3'));
if(path.resolve(src)===out)throw Error('Refusing to overwrite baseline');
if(crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')!=='e8633f497337273b22ee21fafbe56914578f87cc83581d4d87ae29b40962ff89')throw Error('Unexpected baseline');
const read=p=>fs.readFileSync(p,'utf8');
let head=read(path.join(work,'head.txt')).split('// ---- P1:')[0];for(const [key,val] of Object.entries({ROOT:root,SRC:src,OUT:out,STAMP:'MiniPy v4.253'}))head=head.replace(new RegExp(`^const ${key} = .*;$`,'m'),()=>`const ${key} = ${JSON.stringify(val)};`);
const tail=read(path.join(work,'tail.txt')).replace('fs.writeFileSync(OUT_JSON, JSON.stringify(project));','');
const m=new Module(path.join(work,'build253.generated.cjs'),module);m.filename=m.id;m.paths=module.paths;
// sb3lib uses random suffixes and coordinates. Seed only this build, so identical sources produce identical bytes.
const random=Math.random;let seed=827;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
try{m._compile([head,...['helpers','membership','iterators','protocols','syntax','owners'].map(n=>read(path.join(__dirname,n+'.js'))),tail].join('\n'),m.filename);}finally{Math.random=random;}
