
const fs = require('fs');
const A = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/cmp47/v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/cmp47/v7/project.json','utf8'));
const out = [];
const p = (...a)=>out.push(a.join(' '));

function desc(P, tag){
  p('==== ' + tag + ' ====');
  p('meta: semver=' + P.meta.semver + ' vm=' + P.meta.vm + ' agent=' + P.meta.agent);
  p('targets: ' + P.targets.length);
  for (const t of P.targets){
    p('  - ' + (t.isStage?'[STAGE] ':'') + t.name +
      ' | costumes=' + t.costumes.length + ' [' + t.costumes.map(c=>c.name).join(', ') + ']' +
      ' | sounds=' + t.sounds.length + ' [' + t.sounds.map(s=>s.name).join(', ') + ']' +
      ' | blocks=' + Object.keys(t.blocks).length +
      ' | vars=' + Object.keys(t.variables||{}).length + ' | lists=' + Object.keys(t.lists||{}).length +
      ' | bcasts=' + Object.keys(t.broadcasts||{}).length +
      (t.isStage? '' : ' | vis=' + t.visible + ' pos=(' + t.x + ',' + t.y + ') size=' + t.size + ' dir=' + t.direction + ' layer=' + t.layerOrder + ' curCostume=' + t.currentCostume));
    if (t.isStage) p('      stage: tempo=' + t.tempo + ' videoState=' + t.videoState + ' videoTransparency=' + t.videoTransparency + ' textToSpeech=' + JSON.stringify(t.textToSpeech) + ' curBackdrop=' + t.currentCostume);
  }
  p('monitors: ' + P.monitors.length);
  for (const m of P.monitors){
    p('  * ' + (m.opcode||'') + ' ' + JSON.stringify(m.params) + ' mode=' + m.mode + ' visible=' + m.visible + ' x=' + m.x + ' y=' + m.y + ' slider=' + m.sliderMin + '..' + m.sliderMax + ' w=' + m.width + ' h=' + m.height);
  }
  const gv = P.targets.filter(t=>t.isStage)[0].variables;
  p('GLOBAL VARS (' + Object.keys(gv).length + '):');
  for (const k of Object.keys(gv)) {
    const v = gv[k];
    let val = v[1];
    let s = JSON.stringify(val);
    if (s && s.length > 90) s = s.slice(0,90) + '...(' + s.length + ')';
    p('  # ' + v[0] + ' = ' + s);
  }
  const gl = P.targets.filter(t=>t.isStage)[0].lists;
  p('GLOBAL LISTS (' + Object.keys(gl).length + '):');
  for (const k of Object.keys(gl)) {
    const v = gl[k];
    let s = JSON.stringify(v[1]);
    if (s && s.length > 120) s = s.slice(0,120) + '...(' + s.length + ')';
    p('  # ' + v[0] + ' len=' + v[1].length + ' = ' + s);
  }
  const bc = P.targets.filter(t=>t.isStage)[0].broadcasts;
  p('BROADCASTS (' + Object.keys(bc).length + '): ' + Object.values(bc).join(', '));
}
desc(A,'v4'); desc(B,'v7');
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/cmp47/surface.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
