// Round-trip a project through the local scratch-vm (same build run.mjs uses)
// and diff block ids: does the VM's own serializer drop blocks?
// usage: node roundtrip_vm.mjs <in.sb3> <out.json>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const inFile = process.argv[2];
const outFile = process.argv[3];
const vm = new VM();
await vm.loadProject(fs.readFileSync(inFile));
const json = JSON.parse(vm.toJSON());
if (outFile) fs.writeFileSync(outFile, JSON.stringify(json));
console.log(JSON.stringify({ targets: json.targets.map((t) => ({ name: t.name, blocks: Object.keys(t.blocks || {}).length })) }));
