const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.249-cloud.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-merge.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 merged cloud v4.249 + local P819';");
const code=[head,...['p801_cache_throw_fixed.patch.txt','p819_throw_only.cjs','tail.txt'].map(p=>fs.readFileSync(path.join(dir,p),'utf8'))].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build250merge.generated.js'),module);
m.filename=path.join(dir,'build250merge.generated.js');m.paths=module.paths;m._compile(code,m.filename);
