const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.250-p821-genL301-candidate.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p821-gen-send.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250-p821 candidate - preserve fresh generator send side effects';");
const p821=String.raw`
// P821 narrow candidate: a rejected first send(non-None) must not mark the
// generator started. The shared calluser epilogue currently writes GHStarted=1
// after send777 returns; suppress only that write for this one rejected call.
patch('P821 preserve fresh send rejection state',()=>{
  const v=n=>VAR(n);
  newVar('p821FreshSendRejected',0);

  const sendDef=defIdOf('send777 %s %s %s');
  const send=inDef('send777 %s %s %s');
  const sendFirst=BL()[sendDef].next;
  if(!sendFirst)throw Error('[P821] send777 body missing');

  const fresh=find(send,b=>{
    if(b.opcode!=='control_if'||!b.inputs?.CONDITION)return false;
    const sub=b.inputs.SUBSTACK?.[1];
    const s=sub ? JSON.stringify([...reach(sub)].map(id=>BL()[id])) : '';
    return s.includes("can't send non-None value to a just-started generator");
  });
  if(fresh.length!==1)throw Error('[P821] fresh-send guard count='+fresh.length);
  prependStack(fresh[0],'SUBSTACK',setV('p821FreshSendRejected',num(1)));

  const call=inDef('calluser %s %s %s');
  const marks=find(call,b=>{
    if(b.opcode!=='data_replaceitemoflist'||b.fields?.LIST?.[0]!=='GHStarted')return false;
    const s=JSON.stringify(b.inputs?.ITEM||'');
    return s.includes('"1"');
  });
  if(marks.length!==1)throw Error('[P821] GHStarted mark count='+marks.length);
  const mark=marks[0];
  const gated=IF(NOT(EQ(v('p821FreshSendRejected'),num(1))),[
    I('data_replaceitemoflist',{fields:B.LISTF('GHStarted'),inputs:{INDEX:B.REP(v('gmy'),[4,'0']),ITEM:B.REP(num(1),[4,'0'])}})
  ]);
  replaceStmt(mark,gated);
  // Consume the one-shot flag only after the shared calluser epilogue has
  // observed it; nested method calls before this point must not erase it.
  spliceAfter(gated,setV('p821FreshSendRejected',num(0)));
  console.log('[P821] guarded GHStarted mark; fresh guard='+fresh[0]+' mark='+mark+' reset=after-mark');
});
`;
const code=[head,p821,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);
const Module=require('module');const m=new Module(path.join(dir,'build250-p821.generated.js'),module);
m.filename=path.join(dir,'build250-p821.generated.js');m.paths=module.paths;m._compile(code,m.filename);



