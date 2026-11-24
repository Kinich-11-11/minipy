// Validate original assets and exhaustively decode the tables AFTER scratch-vm imports
// the SB3. This tests the data representation; replay.cjs tests the actual blocks.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const {zipRead} = require('../../sb3lib.js');
const VM = require('../../vm5300/node_modules/scratch-vm');
const Cast = require('../../vm5300/node_modules/scratch-vm/src/util/cast');
const digest = (alg, bytes) => createHash(alg).update(bytes).digest('hex');
function inspect(file) {
  const entries = zipRead(file), assets = new Map();
  assert.equal(new Set(entries.map(e => e.name)).size, entries.length, 'duplicate ZIP member');
  const project = JSON.parse(entries.find(e => e.name === 'project.json').data);
  for (const {name,data} of entries) if (name !== 'project.json') {
    assert.equal(digest('md5',data), name.split('.')[0], name);
    assets.set(name,digest('sha256',data));
  }
  for (const t of project.targets) for (const item of [...t.costumes,...t.sounds]) {
    assert.ok(assets.has(item.md5ext) && item.assetId === item.md5ext.split('.')[0], item.name);
  }
  return {project,assets};
}
async function main() {
  const [base,release] = process.argv.slice(2);
  if (!release) throw Error('Usage: node check-package.cjs v4.254.sb3 v4.255.sb3');
  const original = inspect(base), {project,assets} = inspect(release);
  assert.deepEqual(assets, original.assets);
  assert.equal(project.meta.agent,'MiniPy v4.255');
  assert.deepEqual(project.targets.map(t => t.name),original.project.targets.map(t => t.name));
  let newAliases = 0;
  for (const [i,t] of project.targets.entries()) {
    const old = original.project.targets[i];
    if (t.name !== 'Interpreter') { assert.deepEqual(t,old); continue; }
    assert.deepEqual(t.sounds,old.sounds);
    assert.deepEqual(t.costumes.slice(0,old.costumes.length),old.costumes);
    for (const alias of t.costumes.slice(old.costumes.length)) {
      assert.match(alias.name,/^@ord829:[\s\S]$/u);
      assert.deepEqual({...alias,name:old.costumes[0].name},old.costumes[0]);
      newAliases++;
    }
  }
  const vm = new VM();
  try {
    await vm.loadProject(fs.readFileSync(release));
    const target = vm.runtime.targets.find(t => t.getName() === 'Interpreter');
    const list = name => Object.values(target.variables).find(v => v.name === name).value;
    const exact = list('UExact829'), pages = list('UPivots829'), keys = new Map();
    assert.equal(pages.length,256);
    assert.equal(exact.length,target.getCostumes().length);
    target.getCostumes().forEach(({name},i) => {
      const m = /^@(?:cf828|ord829):([\s\S])$/u.exec(name);
      if (!m || m[1].length !== 1) { assert.equal(+exact[i],-1); return; }
      assert.equal(+exact[i],m[1].charCodeAt(0));
      keys.set(m[1],+exact[i]);
    });
    for (let p=0;p<256;p++) assert.equal(pages[p].length,p>=0xd8 && p<0xe0 ? 512 : 256,`page ${p}`);
    // Read the runtime's search pivots, not the generator's exception file or a JS ordinal table.
    const pivot = u => {
      const p = u >>> 8, j = u & 255;
      return pages[p][p < 0xd8 || p >= 0xe0 ? j : j*2 + Number(p>=0xdc)];
    };
    const decode = ch => {
      if (keys.has(ch)) return keys.get(ch);
      let lo=0, hi=65535;
      while (lo<hi) {
        const mid=(lo+hi)>>>1;
        if (Cast.compare('#'+pivot(mid),'#'+ch)<0) lo=mid+1; else hi=mid;
      }
      return lo===9 && Cast.compare('#'+ch,'#\t')<0 ? 8 : lo;
    };
    for (let u=0;u<=0xffff;u++) assert.equal(decode(String.fromCharCode(u)),u,`U+${u.toString(16)}`);
    console.log(JSON.stringify({sha256:digest('sha256',fs.readFileSync(release)), assets:assets.size,
      unchangedOtherTargets:true, originalAssetsUnchanged:true, newSharedCostumeNames:newAliases,
      blocks:project.targets.reduce((n,t)=>n+Object.keys(t.blocks).length,0), importedUnitsChecked:65536}));
  } finally { vm.quit(); }
}
main().catch(error=>{console.error(error); process.exitCode=1;});
