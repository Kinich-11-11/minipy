const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-end-restore-candidate.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-end-restore-candidate.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 end-of-calluser list snapshot candidate';");
const p823=String.raw`
// P823-end: snapshot the list visible at the first real generator resume
// immediately before calluser's fpop, then restore the exact snapshot only
// after calluser's outer frame cleanup.  No throw/yield-from logic is changed.
patch('P823 restore first-resume list snapshot at calluser exit',()=>{
 const v=n=>VAR(n), call=(p,...args)=>callProc(p,args);
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P823LN',[]); B.addList(IT,'P823LV',[]);
 newVar('p823i',0); newVar('p823Pending',0); newVar('p823cur','');
 const cap=newProc('p823capture',[]);
 attachBody(cap.defId,[
  clearL('P823LN'),clearL('P823LV'),setV('p823i',num(1)),setV('p823Pending',num(1)),
  REPEATU(GT(v('p823i'),llen('Names')),[
   IF(EQ(item('Types',v('p823i')),txt('L')),[addTo('P823LN',item('Names',v('p823i'))),addTo('P823LV',item('Values',v('p823i')))]),
   chgV('p823i',num(1))
  ])
 ]);
 const rst=newProc('p823restore',[]);
 attachBody(rst.defId,[
  setV('p823i',num(1)),
  REPEATU(GT(v('p823i'),llen('P823LN')),[
   call('lookup %s',item('P823LN',v('p823i'))),
   IF(GT(v('found'),num(0)),[repl('Values',v('found'),item('P823LV',v('p823i')))]),
   chgV('p823i',num(1))
  ])
 ]);
 const cu=inDef('calluser %s %s %s');
 const fp=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P823-END] fpop='+fp.length);
 const cond=AND(AND(AND(EQ(item('FnKind',v('fi')),txt('G')),GT(v('gmy'),num(0))),EQ(v('grez'),num(1))),EQ(v('pc'),num(5)));
 insertBeforeStmt(fp[0],[IF(cond,[call('p823capture')])]);
 const did=defIdOf('calluser %s %s %s'); let tail=did, guard=0;
 while(BL()[tail]?.next && guard++<2000) tail=BL()[tail].next;
 if(!BL()[tail])throw Error('[P823-END] missing calluser tail');
 spliceAfter(tail,IF(EQ(v('p823Pending'),num(1)),[call('p823restore'),setV('p823Pending',num(0))]));
 console.log('[P823-END] capture before '+fp[0]+'; restore after calluser tail '+tail);
});
`;
const code=[head,p823,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build250-p823-end-restore.generated.js'),module);m.filename=path.join(dir,'build250-p823-end-restore.generated.js');m.paths=module.paths;m._compile(code,m.filename);