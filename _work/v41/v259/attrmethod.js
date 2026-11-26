// MP-96: calling an attribute on a value without a method table (None, int, bool, ...) is an
// AttributeError that names the receiver type, not "only lists have methods".
patch('MP-96: name the receiver type when an attribute call fails',()=>{
  // tname already names the builtin containers; fill the gaps CPython reports for these.
  const extra=[['CPX','complex'],['F','function'],['M','method'],['G','generator']];
  const defId=defIdOf('tname');
  let def=null;
  for(const id of inDef('tname')){
    const b=BL()[id];
    if(b.opcode!=='data_setvariableto'||!b.fields.VARIABLE||b.fields.VARIABLE[0]!=='p6msg')continue;
    const v=b.inputs.VALUE&&b.inputs.VALUE[1];
    const obj=Array.isArray(v)?v[1]==='object':(v&&BL()[v]&&BL()[v].fields&&BL()[v].fields.TEXT&&BL()[v].fields.TEXT[0]==='object');
    if(obj)def=id;
  }
  if(!def)throw Error('tname default not found');
  after(def,...extra.map(([t,name])=>IF(EQ(v('p6t'),s(t)),[sv('p6msg',s(name))])));
  // replaceStmt only swaps one block; splice a whole chain in its place instead.
  const replaceChain=(oldId,ids)=>{
    const first=chain(ids);
    const pred=predecessorOf(oldId),nx=BL()[oldId].next;
    if(pred){BL()[pred].next=first;BL()[first].parent=pred;}
    else{
      const ref=refOf(oldId);
      BL()[ref.pid].inputs[ref.slot]=ref.v.length>2?[ref.v[0],first,ref.v[2]]:[ref.v[0],first];
      BL()[first].parent=ref.pid;
    }
    let t=first;
    while(BL()[t].next)t=BL()[t].next;
    BL()[t].next=nx;
    if(nx)BL()[nx].parent=t;
    delete BL()[oldId];
  };
  const msg=JOIN(s("AttributeError: '"),JOIN(v('p6msg'),JOIN(s("' object has no attribute '"),JOIN(item('Tok',ADD(a('lo'),s('2'))),s("'")))));
  replaceChain('bproced_1a9datpmm',[sv('p6v',v('xa')),sv('p6t',v('xb')),c('tname'),c('fail',msg)]);
});
