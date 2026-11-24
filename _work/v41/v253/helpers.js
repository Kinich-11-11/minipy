const v=VAR,a=argOf,n=num,s=txt,sv=setV;
const c=(p,...xs)=>callProc(p+' %s'.repeat(xs.length),xs);
const proc=(p,args,body)=>attachBody(newProc(p+' %s'.repeat(args.length),args).defId,body);
const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
const after=(id,...xs)=>spliceAfter(id,chain(xs)),before=(id,...xs)=>insertBeforeStmt(id,xs),enter=(p,...xs)=>after(defIdOf(p),...xs);
const rep=(l,i,x)=>I('data_replaceitemoflist',{fields:B.LISTF(l),inputs:{INDEX:B.REP(i,[4,'0']),ITEM:B.REP(x,[10,''])}});
const del=(l,i)=>I('data_deleteoflist',{fields:B.LISTF(l),inputs:{INDEX:B.REP(i,[4,'0'])}});
const idx=(l,x)=>I('data_itemnumoflist',{fields:B.LISTF(l),inputs:{ITEM:B.REP(x,[10,''])}});
const last=l=>item(l,llen(l)),lists=(...ls)=>{for(const l of ls)B.addList(IT,l,[]);after('bdatade_vej52uqnt',...ls.map(clearL));};
const vars=(...ns)=>ns.forEach(x=>newVar(x,0));const is=(name,t)=>EQ(v(name),s(t)),type=t=>is('evtype',t),ok=()=>is('error','');
const result=(value,t)=>[sv('ev',value),sv('evtype',s(t)),sv('evK',s(''))];
const call0=(obj,m)=>[c('egSave764'),c('callmeth',obj,s(m),n(1),n(0)),c('egRestore764')];
const method=(obj,m)=>c('nameHas776FnName',JOIN(item('InstCls',obj),s('.'+m)));
const hasMethod=()=>is('cs776found','1');const fail=msg=>c('fail',s(msg));
// Put a contiguous chain inside a conditional, preserving both its successor and its entry edge.
function guard(first,end,cond){const next=BL()[end].next;BL()[end].next=null;const holder=IF(cond,[]);const pred=predecessorOf(first);if(pred)BL()[pred].next=holder;else {const ref=refOf(first);BL()[ref.pid].inputs[ref.slot][1]=holder;}BL()[holder].inputs.SUBSTACK=[2,first];BL()[holder].next=next;return holder;}
