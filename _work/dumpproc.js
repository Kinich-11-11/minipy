'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function rep(v,d){
  if(v===undefined||v===null) return '_';
  if(Array.isArray(v)) return JSON.stringify(v[1]);
  const b=t.blocks[v];
  if(!b) return '#'+v;
  if(d>8) return '...';
  const I=(k)=>rep(b.inputs[k]&&b.inputs[k][1],d+1);
  switch(b.opcode){
    case 'data_variable': return b.fields.VARIABLE[0];
    case 'data_itemoflist': return b.fields.LIST[0]+'['+I('INDEX')+']';
    case 'data_lengthoflist': return 'len('+b.fields.LIST[0]+')';
    case 'data_itemnumoflist': return 'numof('+b.fields.LIST[0]+','+I('ITEM')+')';
    case 'data_listcontainsitem': return 'has('+b.fields.LIST[0]+','+I('ITEM')+')';
    case 'data_replaceitemoflist': return b.fields.LIST[0]+'['+I('INDEX')+']:='+I('ITEM');
    case 'operator_letter_of': return I('STRING')+'['+I('LETTER')+']';
    case 'operator_join': return '('+I('STRING1')+' + '+I('STRING2')+')';
    case 'operator_not': return 'NOT '+I('OPERAND');
    case 'operator_and': return '('+I('OPERAND1')+' AND '+I('OPERAND2')+')';
    case 'operator_or': return '('+I('OPERAND1')+' OR '+I('OPERAND2')+')';
    case 'operator_equals': return I('OPERAND1')+' == '+I('OPERAND2');
    case 'operator_gt': return I('OPERAND1')+' > '+I('OPERAND2');
    case 'operator_lt': return I('OPERAND1')+' < '+I('OPERAND2');
    case 'operator_contains': return I('OPERAND1')+' in '+I('OPERAND2');
    case 'operator_add': return '('+I('NUM1')+' + '+I('NUM2')+')';
    case 'operator_subtract': return '('+I('NUM1')+' - '+I('NUM2')+')';
    case 'operator_multiply': return '('+I('NUM1')+' * '+I('NUM2')+')';
    case 'operator_divide': return '('+I('NUM1')+' / '+I('NUM2')+')';
    case 'operator_mod': return '('+I('NUM1')+' % '+I('NUM2')+')';
    case 'procedures_call': return '<'+b.mutation.proccode+'>';
    default: return b.opcode;
  }
}
function tree(defId, depth, maxd, label, isChain){
  let id=isChain?defId:t.blocks[defId].next;
  while(id){
    const b=t.blocks[id];
    let extra='';
    if(b.opcode==='data_setvariableto') extra=' '+b.fields.VARIABLE[0]+' = '+rep(b.inputs.VALUE&&b.inputs.VALUE[1],0);
    else if(b.opcode==='data_changevariableby') extra=' '+b.fields.VARIABLE[0]+' += '+rep(b.inputs.VALUE&&b.inputs.VALUE[1],0);
    else if(b.opcode==='control_if'||b.opcode==='control_if_else') extra=' IF '+rep(b.inputs.CONDITION&&b.inputs.CONDITION[1],0);
    else if(b.opcode==='control_repeat'||b.opcode==='control_repeat_until') extra=' rep '+rep((b.inputs.TIMES||b.inputs.CONDITION)[1],0);
    else if(b.opcode==='data_addtolist') extra=' '+b.fields.LIST[0]+' += '+rep(b.inputs.ITEM&&b.inputs.ITEM[1],0);
    else if(b.opcode==='data_deletealloflist') extra=' '+b.fields.LIST[0];
    else if(b.opcode==='procedures_call') extra=' ARGS('+Object.entries(b.inputs).map(([k,v])=>rep(v[1],0)).join(', ')+')';
    console.log('  '.repeat(depth)+id+'  '+b.opcode+extra);
    if(depth<maxd){
      for(const [k,v] of Object.entries(b.inputs||{})){
        if(Array.isArray(v)&&v[1]&&typeof v[1]==='string'&&k!=='custom_block'&&t.blocks[v[1]]&&b.opcode!=='procedures_call'){
          console.log('  '.repeat(depth+1)+'.'+k+':');
          tree(v[1], depth+2, maxd, null, true);
        }
      }
    }
    id=b.next;
  }
}
const which=process.argv[2];
console.log('=== '+which+' ===');
if(which.slice(0,3)==='id='){ tree(which.slice(3),0,Number(process.argv[3]||5),null,true); }
else tree(findDef(which),0,Number(process.argv[3]||5));
