// Apply this delta to the exact published v4.255, using the project's Scratch block builder.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const {createHash} = require('node:crypto');
const read = p => fs.readFileSync(p, 'utf8');
const work = path.dirname(__dirname), root = path.resolve(work, '../..');
const src = path.join(root, 'MiniPy_v4.255.sb3');
const out = path.resolve(process.argv[2] || path.join(root, 'MiniPy_v4.256.sb3'));
if (path.relative(src, out) === '') throw Error('Refusing to overwrite the baseline');
if (createHash('sha256').update(fs.readFileSync(src)).digest('hex') !==
    'bedebd5a3acef2be2f7d285af826c60ed035ec21f825988d9e6242572992c2b8') throw Error('Unexpected v4.255 baseline');
if (process.env.V41_SKIP || process.env.V41_TRACE) throw Error('Use an unmodified release build environment');
let head = read(path.join(work, 'head.txt')).split('// ---- P1:')[0];
for (const [key, value] of Object.entries({ROOT: root, SRC: src, OUT: out, STAMP: 'MiniPy v4.256'})) {
  head = head.replace(new RegExp(`^const ${key} = .*;$`, 'm'), () => `const ${key} = ${JSON.stringify(value)};`);
}
const m = new Module(path.join(work, 'build256.generated.cjs'), module);
m.filename = m.id; m.paths = module.paths;
const tail = read(path.join(work, 'tail.txt')).replace('fs.writeFileSync(OUT_JSON, JSON.stringify(project));', '');
const random = Math.random; let seed = 830;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
try {
  m._compile([head, read(path.join(work, 'v253/helpers.js')), ...['runtime','protocols','sequences','lazy','stdlib','hashing','frozen','modules','heap','counter'].map(f=>read(path.join(__dirname,f+'.js'))), tail].join('\n'), m.filename);
} finally { Math.random = random; }
