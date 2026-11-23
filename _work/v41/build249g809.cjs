// Rebuild v4.248 from the published v4.247 SB3 and apply P790/P791.
const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.247.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.249-candidate.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project249-candidate.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.249 candidate';");
const code=[head,...['p785.txt','p786.txt','p787.txt','p788.txt','p789.txt','p790base.patch.txt','p790g.patch.txt','p801_cache_throw_fixed.patch.txt','p802_alias_diag_fixed.patch.txt','p809_trace.cjs','tail.txt'].map(p=>fs.readFileSync(path.join(dir,p),'utf8'))].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build249.generated.js'),module);
m.filename=path.join(dir,'build249.generated.js');m.paths=module.paths;m._compile(code,m.filename);

