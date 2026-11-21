'use strict';
// This is a custom block simulator, NOT the official scratch-vm.
const fs=require('fs'), path=require('path'), cp=require('child_process'), assert=require('assert');
const {VM}=require('./vm');
const {zipRead}=require('./sb3lib');
const ROOT=path.resolve(__dirname,'..');
const project=JSON.parse(zipRead(path.join(ROOT,'MiniPy_v4.1.sb3')).find(e=>e.name==='project.json').data);
class TestVM extends VM {
  constructor(p,opts={}) { super(p,opts); for(const t of this.targets) if(t!==this.stage){
    const vr=t.varRef.bind(t),lr=t.listRef.bind(t);
    t.varRef=f=>vr(f)||this.stage.varRef(f);t.listRef=f=>lr(f)||this.stage.listRef(f);
  }}
  *evalInputArray(th,inp){if(Array.isArray(inp[1]))return this.primValue(th,inp[1]);return yield* super.evalInputArray(th,inp);}
}
function run(code){const vm=new TestVM(project,{skipTargets:['Controller','TextRenderer'],maxSteps:50000000});
vm.stage.listsByName.Code.value=code.split('\n'); vm.stage.setVar('running',1);vm.stage.setVar('mode',0);vm.stage.setVar('stopreq',0);vm.broadcast('RUN');vm.run(30000);
assert(!vm.threads.some(t=>t.kind==='broadcast:RUN'),'unfinished');
return {output:vm.stage.getList('Output').map(String),error:vm.targetByName('Interpreter').varRef({VARIABLE:['error']}).value,page:vm.stage.getVar('outpage')};}
function invoke(vm,target,name,args=[]){const t=vm.targetByName(target),def=vm.findProcedure(t,name);assert(def,name);const th=vm.startThread(t,t.blocks[def].next,'test');th.warp=true;th.args.push(Object.fromEntries(vm.procArgNames(t,def).map((n,i)=>[n,args[i]])));vm.run(30000);}
const cases=[
['arithmetic','a = 5\nprint(a + 2)'],
['tuple','a, b = 3, 7\na, b = b, a\nprint(a)\nprint(b)'],
['chain','a = b = c = 9\nprint(a + b + c)'],
['strings',"s = 'abcdef'\nprint(s[0])\nprint(s[-1])\nprint(s[1:4])\nprint(s[:2])\nprint(s[2:])\nprint(s[:])\nprint(s[5:2])\nprint(s[-20:99])"],
['string-loop',"for ch in 'AbC':\n    print(ch)"],
['range','total = 0\nfor i in range(1, 13):\n    total += i\nprint(total)'],
['del','x = 4\ndel x\nx = 7\nprint(x)'],
['assert','assert 1 == 1\nprint(7)'],
];
function test(){let results=[];for(const[name,code]of cases){const got=run(code),py=cp.spawnSync('py',['-3','-c',code],{encoding:'utf8'});const want=py.stdout.replace(/\r/g,'').trimEnd().split('\n').map(String);const pass=!got.error&&JSON.stringify(got.output)===JSON.stringify(want);results.push({name,code,...got,python:want,pass});console.log(name,pass?'PASS':'FAIL',JSON.stringify(got));}
fs.mkdirSync(path.join(ROOT,'v4.1'),{recursive:true});fs.writeFileSync(path.join(ROOT,'v4.1','test-results.json'),JSON.stringify({simulator:'custom _work/vm.js with primitive/global lookup adapter, not official scratch-vm',results},null,2));return results;}
if(require.main===module){if(test().some(r=>!r.pass))process.exitCode=1;}
module.exports={TestVM,run,invoke,project,test,cases};
