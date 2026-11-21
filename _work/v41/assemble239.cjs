// v4.239 = v4.238 manifest plus P757; retain the original version's builder.
const fs=require('fs'),path=require('path');
const dir=__dirname;
const src=fs.readFileSync(path.join(dir,'assemble238.cjs'),'utf8');
const code=src.replace("'p756.txt');","'p756.txt','p757.txt');")
  .replace("'p756.txt','tail.txt'","'p757.txt','tail.txt'")
  .replace("['head.txt','p749.txt','p750.txt','p751.txt','p752.txt','p753.txt','p754.txt','p757.txt','tail.txt']","['head.txt','p757.txt','tail.txt']")
  .replaceAll('MiniPy_v4.238.sb3','MiniPy_v4.239.sb3')
  .replaceAll('MiniPy_v4.237.sb3','MiniPy_v4.238.sb3')
  .replaceAll('MiniPy v4.238','MiniPy v4.239')
  .replaceAll('project238.json','project239.json')
  .replaceAll('build238delta.js','build239delta.js')
  .replaceAll('build238.js','build239.js');
new Function('require','__dirname','process',code)(require,dir,process);
