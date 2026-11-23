const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p824-debug.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p824-debug.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P824 merge debug';");
const patch=String.raw`
patch('P824 merge debug',()=>{
 const v=n=>VAR(n),call=(p,...args)=>callProc(p,args); B.addList(IT,'P824Trace',[]); newVar('p824FreshRejected',0);
 const sd=inDef('send777 %s %s %s');const fresh=find(sd,b=>{if(b.opcode!=='control_if'||!b.inputs?.CONDITION)return false;const sub=b.inputs.SUBSTACK?.[1];const s=sub?JSON.stringify([...reach(sub)].map(id=>BL()[id])):'';return s.includes("can't send non-None value to a just-started generator");}); if(fresh.length!==1)throw Error('fresh '+fresh.length);prependStack(fresh[0],'SUBSTACK',setV('p824FreshRejected',num(1)));
 const cu=inDef('calluser %s %s %s');const fp=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');if(fp.length!==1)throw Error('fpop '+fp.length);const gate=AND(EQ(v('p824FreshRejected'),num(1)),AND(GT(v('gmy'),num(0)),AND(EQ(v('grez'),num(1)),EQ(item('GHInject783',v('gmy')),num(0)))));insertBeforeStmt(fp[0],[IF(gate,[call('p801capture')])]);spliceAfter(fp[0],IF(EQ(v('p824FreshRejected'),num(1)),[setV('p824FreshRejected',num(0))]));
 const rst=inDef('p801restore');const repl=find(rst,b=>b.opcode==='data_replaceitemoflist'&&b.fields?.LIST?.[0]==='Values');if(repl.length!==1)throw Error('repl '+repl.length);const lv=item('P801LV',v('p811i'));const prefix=[call('substr %s %s %s',lv,num(1),lenOf(v('p818cur'))),addTo('P824Trace',JOIN(JOIN(txt('full='),lv),JOIN(JOIN(txt(':cur='),v('p818cur')),JOIN(txt(':ev='),v('ev'))))),IF(EQ(v('ev'),v('p818cur')),[I('data_replaceitemoflist',{fields:B.LISTF('Values'),inputs:{INDEX:B.REP(v('found'),[4,'0']),ITEM:B.REP(lv,[4,'0'])}})],[I('data_replaceitemoflist',{fields:B.LISTF('Values'),inputs:{INDEX:B.REP(v('found'),[4,'0']),ITEM:B.REP(JOIN(lv,v('p818cur')),[4,'0'])}})])];replaceStmt(repl[0],chain(prefix)); console.log('[P824] debug');
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');new Function(code);const Module=require('module'),m=new Module(path.join(dir,'build250-p824-debug.generated.js'),module);m.filename=path.join(dir,'build250-p824-debug.generated.js');m.paths=module.paths;m._compile(code,m.filename);
