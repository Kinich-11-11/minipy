
import fs from 'fs';
import SB3Creator from '../../sb3-creator-main/sb3-creator-main/src/utils/sb3Creator.js';
const [, , jsonPath, outDir] = process.argv;
const project = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const c = new SB3Creator();
c.project = project;
const summary = [];
for (const t of project.targets) {
  let lines;
  try { lines = c.decompileTargetScripts(t); } catch (e) { lines = ['// DECOMPILE ERROR: ' + e.message]; }
  const name = t.name.replace(/[^A-Za-z0-9_.-]/g, '_');
  fs.writeFileSync(outDir + '\\' + name + '.txt', lines.join('\n'));
  summary.push(name + ': ' + lines.length + ' lines');
}
console.log(summary.join('\n'));
