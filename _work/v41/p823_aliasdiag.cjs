const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-aliasdiag.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-aliasdiag.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 fpop alias diagnostic';");
const patch=String.raw`
patch('P823 diagnose list aliases at fpop',()=>{
 const v=n=>VAR(n); B.addList(IT,'P823Diag',[]); newVar('p823i',0);
 const d=inDef('calluser %s %s %s'); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P823-ALIASDIAG] fpop='+fp.length);
 const state=(lab)=>{
   const out=[addTo('P823Diag',txt(lab)),setV('p823i',num(1))];
   out.push(REPEATU(GT(v('p823i'),llen('Names')),[
     IF(EQ(item('Types',v('p823i')),txt('L')),[addTo('P823Diag',JOIN(JOIN(JOIN(JOIN(txt('i='),v('p823i')),txt(' n=')),item('Names',v('p823i'))),JOIN(txt(' v='),item('Values',v('p823i')))))]),
     chgV('p823i',num(1))
   ]));
   return out;
 };
 insertBeforeStmt(fp[0],state('BEFORE'));
 spliceAfter(fp[0],chain(state('AFTER')));
 console.log('[P823-ALIASDIAG] installed '+fp[0]);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n'); new Function(code); const Module=require('module'),m=new Module(path.join(dir,'build250-p823-aliasdiag.generated.js'),module);m.filename=path.join(dir,'build250-p823-aliasdiag.generated.js');m.paths=module.paths;m._compile(code,m.filename);