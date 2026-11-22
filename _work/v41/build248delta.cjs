// Rebuild v4.248 from the published v4.247 SB3.
const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.247.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.248.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project248.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.248';");
const code=[head,...['p785.txt','p786.txt','p787.txt','p788.txt','p789.txt','tail.txt'].map(p=>fs.readFileSync(path.join(dir,p),'utf8'))].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build248.generated.js'),module);
m.filename=path.join(dir,'build248.generated.js');m.paths=module.paths;m._compile(code,m.filename);
