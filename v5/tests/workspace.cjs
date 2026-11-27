'use strict';
// Exercise the VM's actual editor workspace serializer, not a hand-built XML view.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const VM = require(process.env.MINIPY_VM || '../../_work/vm5300/node_modules/scratch-vm');
const { zipRead } = require('../../_work/sb3lib.js');
const parse = `import sys,json,xml.etree.ElementTree as E\nx=E.fromstring(sys.stdin.buffer.read()); local=lambda tag:tag.rsplit('}',1)[-1]; print(json.dumps({'roots':sum(local(b.tag)=='block' for b in x),'definitions':sum(b.get('type')=='procedures_definition' for b in x.iter())}))`;
async function main() {
  const [src, out] = process.argv.slice(2),
    raw = fs.readFileSync(src),
    vm = new VM();
  const project = JSON.parse(zipRead(raw).find((e) => e.name === 'project.json').data);
  const report = { sha256: crypto.createHash('sha256').update(raw).digest('hex'), targets: [] };
  try {
    await vm.loadProject(raw);
    let xml;
    vm.on('workspaceUpdate', (event) => {
      xml = event.xml;
    });
    for (const t of vm.runtime.targets) {
      xml = null;
      const row = { name: t.getName() };
      report.targets.push(row);
      try {
        vm.setEditingTarget(t.id);
        vm.emitWorkspaceUpdate();
        if (!xml) throw Error('no workspaceUpdate');
        const r = spawnSync(process.env.PYEXE || 'python', ['-c', parse], {
          input: Buffer.from(xml),
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
        });
        if (r.status !== 0) throw Error(r.stderr.trim().split(/\r?\n/).at(-1));
        const counts = JSON.parse(r.stdout),
          blocks = Object.values(project.targets.find((v) => v.name === t.getName()).blocks);
        if (
          counts.roots !== blocks.filter((x) => x.topLevel).length ||
          counts.definitions !== blocks.filter((x) => x.opcode === 'procedures_definition').length
        )
          throw Error('workspace lost top-level scripts or definitions');
        Object.assign(row, counts, { xmlBytes: Buffer.byteLength(xml), pass: true });
      } catch (e) {
        Object.assign(row, { pass: false, error: e.message });
      }
    }
  } finally {
    vm.quit();
    fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  }
  return report.targets.every((x) => x.pass) ? 0 : 1;
}
console.log = console.warn = () => {};
main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e);
    process.exit(2);
  });
