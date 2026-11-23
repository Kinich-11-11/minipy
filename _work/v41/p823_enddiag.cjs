const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-enddiag.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-enddiag.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 calluser tail diagnostic';");
const patch=String.raw`
patch('P823 diagnose calluser tail alias target',()=>{
 const v=n=>VAR(n), call=(p,...args)=>callProc(p,args); B.addList(IT,'P823Diag',[]); newVar('p823i',0);
 const d=inDef('calluser %s %s %s'); newVar('p823Pending',0); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P823-ENDDIAG] fpop='+fp.length);
 const msg=(lab)=>JOIN(JOIN(JOIN(JOIN(JOIN(JOIN(txt(lab+' pending='),v('p823Pending')),txt(' fi=')),v('fi')),txt(' n=')),llen('Names')),JOIN(JOIN(txt(' v='),llen('Values')),txt('')));
 const cap=newProc('p823capture',[]);
 attachBody(cap.defId,[addTo('P823Diag',msg('CAP'))]);
 newVar('p823Pending',0);
 insertBeforeStmt(fp[0],[IF(AND(AND(AND(EQ(item('FnKind',v('fi')),txt('G')),GT(v('gmy'),num(0))),EQ(v('grez'),num(1))),EQ(v('pc'),num(5))),[callProc('p823capture',[])])]);
 const did=defIdOf('calluser %s %s %s'); let tail=did, guard=0; while(BL()[tail]?.next&&guard++<2000)tail=BL()[tail].next;
 const tailSeq=[addTo('P823Diag',msg('TAIL')),call('lookup %s',txt('log')),addTo('P823Diag',JOIN(JOIN(txt('LOOK found='),v('found')),JOIN(txt(' val='),item('Values',v('found')))))];
 spliceAfter(tail,chain(tailSeq));
 console.log('[P823-ENDDIAG] tail='+tail);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');new Function(code);const Module=require('module'),m=new Module(path.join(dir,'build250-p823-enddiag.generated.js'),module);m.filename=path.join(dir,'build250-p823-enddiag.generated.js');m.paths=module.paths;m._compile(code,m.filename);