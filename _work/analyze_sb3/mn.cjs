
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const mn = ['MOV','ADD','SUB','INT','JMP','JE','JNE','CALL','RET','PUSH','POP','CMP','INC','DEC','MUL','DIV','NOP','HLT','LEA','XOR','AND','OR','NOT','SHL','SHR','LOOP','DB','DW','EQU','PROC','ENDP','SEGMENT','ENDS','ASSUME','ORG','END','OFFSET','PTR','BYTE','WORD'];
const txt = JSON.stringify(p.targets.find(t=>t.name==='MASM8086'));
for (const m of mn) { const re=new RegExp('"'+m+'"','g'); const n=(txt.match(re)||[]).length; if(n) console.log(m+': '+n); }
console.log('--- renderer size ---', txt.length);
// also list directives/operators values
const stage = p.targets.find(t=>t.isStage);
for (const key of ['OP_operator','OP_directive','OP_register','HEX_CHAR']) {
  const e = Object.entries(stage.lists).find(([k,v])=>v[0]===key);
  if (e) console.log(key+' ['+e[1][1].length+']: '+JSON.stringify(e[1][1]));
}
