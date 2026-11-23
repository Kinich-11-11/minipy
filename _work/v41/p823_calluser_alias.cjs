const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.250-p823-alias-candidate.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-alias-candidate.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 calluser/fpop outer alias candidate';");
const code=[head,fs.readFileSync(path.join(dir,'p821_send_restore_local.cjs'),'utf8'),fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build250-p823-alias.generated.js'),module);
m.filename=path.join(dir,'build250-p823-alias.generated.js');m.paths=module.paths;m._compile(code,m.filename);
