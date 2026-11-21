const fs = require('fs');
const path = require('path');
const dir = __dirname;
const source = fs.readFileSync(path.join(dir, 'assemble230.cjs'), 'utf8');
const parts = JSON.parse(source.match(/const parts=(\[[^\n]+\]);/)[1].replace(/'/g, '"'));
parts.splice(parts.indexOf('tail.txt'), 0, 'p724.txt', 'p725.txt', 'p726.txt', 'p727.txt', 'p728.txt', 'p729.txt', 'p730.txt', 'p731.txt', 'p732.txt', 'p733.txt', 'p734.txt', 'p799dbg.txt');
if (new Set(parts).size !== parts.length) throw new Error('Duplicate patch parts');
const texts = parts.map(p => {
  let text = fs.readFileSync(path.join(dir, p), 'utf8').replace(/\r/g, '').trimEnd();
  if (p === 'tail.txt') text = text.slice(text.indexOf('// ---- DEBUG'));
  return text;
});
const output = path.join(dir, 'build235.js');
const code = texts.join('\n\n') + '\n';
new Function(code);
fs.writeFileSync(output, code);
console.log('assemble234: ' + parts.length + ' parts -> ' + output);
