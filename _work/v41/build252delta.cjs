// Rebuild the candidate from the verified v4.251 archive, never from an experimental SB3.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Module=require('module');
const dir=__dirname, root=path.resolve(dir,'../..'), src=path.join(root,'MiniPy_v4.251.sb3');
if(crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')!=='119161a6c120f6cf39e35f8addc05a43605a4778d6a4bd1cc3b12d4d5c2c3671')throw Error('Unexpected v4.251 base');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const head=read('head.txt').split('// ---- P1:')[0].replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname,'../..');").replace(/^const SRC = .*;$/m,`const SRC = ${JSON.stringify(src)};`).replace(/^const OUT = .*;$/m,"const OUT = path.join(__dirname,'MiniPy_v4.252-candidate.sb3');").replace(/^const STAMP = .*;$/m,"const STAMP = 'MiniPy v4.252';");
const m=new Module(path.join(dir,'build252.generated.cjs'),module); m.filename=m.id;m.paths=module.paths;
m._compile([head,read('v252_runtime.txt'),read('tail.txt').replace('fs.writeFileSync(OUT_JSON, JSON.stringify(project));','')].join('\n'),m.filename);
