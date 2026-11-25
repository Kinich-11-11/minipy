// A direct RUN broadcast executes the user's program as the __main__ module.
patch('Initialize __name__ for each top-level RUN',()=>{
  const runHats=allIds().filter(id=>{
    const b=BL()[id];return b.opcode==='event_whenbroadcastreceived'&&b.fields.BROADCAST_OPTION?.[0]==='RUN';
  });
  if(runHats.length!==1)throw Error('Expected exactly one RUN hat');
  const typeClears=[];let id=BL()[runHats[0]].next,guard=0;
  while(id&&guard++<1000){
    const b=BL()[id];
    if(b.opcode==='data_deletealloflist'&&b.fields.LIST?.[0]==='Types')typeClears.push(id);
    id=b.next;
  }
  if(typeClears.length!==1)throw Error('Expected one top-level Types reset');
  // Names/Values/Types have just been cleared. Use the normal assignment path
  // so this behaves like a genuine Python global, visible to functions and writable.
  after(typeClears[0],c('assign',s('__name__'),s('__main__'),s('S')));
});