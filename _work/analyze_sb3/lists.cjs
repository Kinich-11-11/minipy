
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f+'.json','utf8'));}
function lst(p,target,name){const t=p.targets.find(x=>x.name===target); if(!t)return null; const e=Object.values(t.lists||{}).find(v=>v[0]===name); return e?e[1]:null;}
const a=load('8086'), b=load('py');
console.log('8086 HIGHLIGHTING_CONFIG:', JSON.stringify(lst(a,'Stage','HIGHLIGHTING_CONFIG')));
console.log('8086 KEYS:', JSON.stringify(lst(a,'Stage','KEYS')));
console.log('8086 KEY_map:', JSON.stringify(lst(a,'Stage','KEY_map')));
console.log('8086 file:', JSON.stringify(lst(a,'Stage','file')));
console.log('8086 code sample:', JSON.stringify(lst(a,'Stage','code')));
console.log('8086 memory len:', (lst(a,'Stage','memory')||[]).length, 'first:', JSON.stringify((lst(a,'Stage','memory')||[]).slice(0,4)));
console.log('8086 console:', JSON.stringify(lst(a,'Stage','console')));
console.log('8086 CHAR_width len:', (lst(a,'Stage','CHAR_width')||[]).length);
console.log('');
console.log('py dataDefaultCode:', JSON.stringify(lst(b,'GUI','dataDefaultCode'),null,1).slice(0,1500));
console.log('py fontShow:', JSON.stringify(lst(b,'GUI','fontShow')));
console.log('py inputKeyboard:', JSON.stringify(lst(b,'GUI','inputKeyboard')));
console.log('py showingCode:', JSON.stringify(lst(b,'Stage','showingCode')));
console.log('py response:', JSON.stringify(lst(b,'Stage','response')));
