// Round-trip a project through the scratch-vm source tree in the workspace
// (scratch-vm-develop, the fork the community player seems to use) and diff ids.
// Run with:  node --experimental-default-type=module roundtrip_dev.mjs <in.sb3> <out.json>
import fs from 'fs';
import { zipRead } from '../sb3lib.js';
// eslint-disable-next-line
import VM from 'file:///D:/编程/scratch/ai/minipython/scratch-vm-develop/scratch-vm-develop/src/index.js';

const inFile = process.argv[2];
const outFile = process.argv[3];
const vm = new VM();
await vm.loadProject(fs.readFileSync(inFile));
const json = JSON.parse(vm.toJSON());
if (outFile) fs.writeFileSync(outFile, JSON.stringify(json));
let dangling = [];
for (const t of json.targets) {
    const B = t.blocks || {};
    for (const [id, b] of Object.entries(B)) {
        if (!b || Array.isArray(b)) continue;
        for (const [slot, inp] of Object.entries(b.inputs || {})) {
            if (Array.isArray(inp) && (inp[0] === 2 || inp[0] === 3) && typeof inp[1] === 'string' && !B[inp[1]]) dangling.push(t.name + ':' + id + '.' + slot + '->' + inp[1]);
        }
    }
}
console.log(JSON.stringify({ targets: json.targets.map((t) => ({ name: t.name, blocks: Object.keys(t.blocks || {}).length })), dangling: dangling.length, danglingDetail: dangling }, null, 1));
