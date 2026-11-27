'use strict';
// Introspect a normal, completed RUN without adding any block or list to the SB3.
const fs = require('node:fs');
const { session } = require('../tests/run.cjs');
async function main() {
  const [archive, source, ...names] = process.argv.slice(2);
  if (!source) throw Error('inspect-run.cjs archive.sb3 program.py [variable/list ...]');
  const s = await session(archive);
  try {
    const run = s.run({ code: fs.readFileSync(source, 'utf8') }, { out: [], error: '' });
    const state = {};
    for (const t of s.vm.runtime.targets)
      for (const x of Object.values(t.variables))
        if (names.includes(x.name)) state[t.getName() + '/' + x.name] = x.value;
    process.stdout.write(
      JSON.stringify(
        { out: run.out, error: run.error, line: run.line, completed: run.state.finished, state },
        null,
        2,
      ) + '\n',
    );
  } finally {
    s.vm.quit();
  }
}
console.log = console.warn = () => {};
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(2);
  });
