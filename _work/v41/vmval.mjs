// vmval.mjs <sb3> : print the char codes of every `set ec = <literal>` value AS THE VM SEES IT
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const it = vm.runtime.targets.find((t) => t.getName() === 'Interpreter');
const blocks = it.blocks._blocks;
const fieldOf = (id) => {
  const b = blocks[id];
  if (!b) return null;
  for (const k of ['TEXT', 'NUM', 'VALUE']) if (b.fields[k]) return String(b.fields[k].value);
  return null;
};
for (const id of Object.keys(blocks)) {
  const b = blocks[id];
  if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE.value === 'ec' && b.inputs.VALUE) {
    const inp = b.inputs.VALUE;
    const viaBlock = inp.block ? fieldOf(inp.block) : null;
    const viaShadow = inp.shadow ? fieldOf(inp.shadow) : null;
    const s = viaBlock !== null ? viaBlock : viaShadow;
    console.log(id + ' op=' + (inp.block && blocks[inp.block] ? blocks[inp.block].opcode : '-')
      + ' len=' + (s === null ? '?' : s.length)
      + ' codes=' + (s === null ? '?' : Array.from(s).map((c) => c.charCodeAt(0)).join(',')));
  }
}
