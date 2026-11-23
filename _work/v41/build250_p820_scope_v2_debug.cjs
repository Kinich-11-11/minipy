const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p820-scope-v2-debug.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p820-scope-v2-debug.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250-p820 scope-v2 experiment';");
const code=[head,
  fs.readFileSync(path.join(dir,'p801_cache_throw_fixed.patch.txt'),'utf8'),
  fs.readFileSync(path.join(dir,'p819_throw_only.cjs'),'utf8'),
  fs.readFileSync(path.join(dir,'p820_scope_v2_debug.cjs'),'utf8'),
  fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);
const Module=require('module'),m=new Module(path.join(dir,'build250-p820-scope-v2.generated.js'),module);
m.filename=path.join(dir,'build250-p820-scope-v2.generated.js');m.paths=module.paths;m._compile(code,m.filename);

