const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.250-p822-initialpc-diag.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p822-initialpc-diag.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P822 initial-PC diagnostic';");
const p822=String.raw`
patch('P822 initial PC diagnostic',()=>{
  if(process.env.V41_P822_DIAG!=='1'){ console.log('[P822] clean candidate: no functional initial-PC patch; diagnosis only'); return; }
  const v=n=>VAR(n), at=(l,i)=>item(l,i), j=(a,b)=>JOIN(a,b);
  const field=(list,index)=>at(list,index);
  const trace=(tag,extra)=>{
    let s=txt(tag);
    const parts=[
      [' pc=',v('pc')],[' fi=',v('fi')],[' fk=',field('FnKind',v('fi'))],
      [' fs=',field('FnStart',v('fi'))],[' fe=',field('FnEnd',v('fi'))],
      [' gmy=',v('gmy')],[' gs=',field('GHStarted',v('gmy'))],
      [' gcur=',v('gcur')],[' gyld=',v('gyld')],[' grez=',v('grez')],
      [' ret=',v('retflag')]
    ];
    for(const [a,b] of parts)s=j(s,j(txt(a),b));
    if(extra)s=j(s,extra);
    return addTo('Output',s);
  };
  const sendDef=defIdOf('send777 %s %s %s');
  const send=inDef('send777 %s %s %s');
  insertBeforeStmt(BL()[sendDef].next,[trace('P822 SEND-enter',j(txt(' arg='),v('send777v')))]);
  const fresh=find(send,b=>b.opcode==='control_if'&&b.inputs?.CONDITION?.[1]&&[...reach(b.inputs.CONDITION[1])].some(x=>JSON.stringify(BL()[x]).includes('GHStarted')));
  if(fresh.length!==1)throw Error('[P822] fresh guard='+fresh.length);
  insertBeforeStmt(fresh[0],[trace('P822 SEND-before-fresh-guard')]);
  const gx=inDef('gxpull %s');
  const gxCalls=find(gx,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='calluser %s %s %s');
  if(gxCalls.length!==1)throw Error('[P822] gx calluser='+gxCalls.length);
  insertBeforeStmt(gxCalls[0],[trace('P822 GXPULL-before-calluser',j(txt(' g='),argOf('g')))]);
  spliceAfter(gxCalls[0],trace('P822 GXPULL-after-calluser'));
  const cu=inDef('calluser %s %s %s');
  const fiSet=find(cu,b=>b.opcode==='data_setvariableto'&&b.fields?.VARIABLE?.[0]==='fi');
  console.log('[P822] fi set candidates='+fiSet.length);
  if(fiSet.length)spliceAfter(fiSet[fiSet.length-1],trace('P822 CU-after-fi'));
  const pcSet=find(cu,b=>b.opcode==='data_setvariableto'&&b.fields?.VARIABLE?.[0]==='pc'&&b.inputs?.VALUE?.[1]==='bdatait_15iybc8l2');
  if(pcSet.length!==1)throw Error('[P822] pc set='+pcSet.length);
  insertBeforeStmt(pcSet[0],[trace('P822 CU-before-initial-pc')]);
  spliceAfter(pcSet[0],trace('P822 CU-after-initial-pc'));
  const execs=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='execute');
  for(const c of execs){insertBeforeStmt(c,[trace('P822 CU-before-execute')]);}
  console.log('[P822] diagnostic hooks installed: send='+fresh[0]+' pc='+pcSet[0]+' execute='+execs.length);
});
`;
const code=[head,p822,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build250-p822-initialpc-diag.generated.js'),module);
m.filename=path.join(dir,'build250-p822-initialpc-diag.generated.js');m.paths=module.paths;m._compile(code,m.filename);
