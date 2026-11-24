// Apply this delta to the exact published v4.253, using the project's Scratch block builder.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const {createHash} = require('node:crypto');
const read = p => fs.readFileSync(p, 'utf8');
const work = path.dirname(__dirname), root = path.resolve(work, '../..');
const src = path.join(root, 'MiniPy_v4.253.sb3');
const out = path.resolve(process.argv[2] || path.join(root, 'MiniPy_v4.254.sb3'));
if (path.relative(src, out) === '') throw Error('Refusing to overwrite the baseline');
if (createHash('sha256').update(fs.readFileSync(src)).digest('hex') !==
    'ed82a26c41906a594cf66117f166d1d593cc65ec545f2b5ea3592f6278d60169') throw Error('Unexpected v4.253 baseline');
if (process.env.V41_SKIP || process.env.V41_TRACE) throw Error('Use an unmodified release build environment');
let head = read(path.join(work, 'head.txt')).split('// ---- P1:')[0];
for (const [key, value] of Object.entries({ROOT: root, SRC: src, OUT: out, STAMP: 'MiniPy v4.254'})) {
  head = head.replace(new RegExp(`^const ${key} = .*;$`, 'm'), () => `const ${key} = ${JSON.stringify(value)};`);
}
const m = new Module(path.join(work, 'build254.generated.cjs'), module);
m.filename = m.id; m.paths = module.paths;
const tail = read(path.join(work, 'tail.txt')).replace('fs.writeFileSync(OUT_JSON, JSON.stringify(project));', '');
const random = Math.random; let seed = 828;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
try {
  m._compile([head, read(path.join(work, 'v253/helpers.js')), read(path.join(__dirname, 'runtime.js')), tail].join('\n'), m.filename);
} finally { Math.random = random; }
