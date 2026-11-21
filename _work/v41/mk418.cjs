const fs = require('fs');
let s = fs.readFileSync('_work/v41/p417.txt', 'utf8');
s = s.replace("      if (w.fields && w.fields.VARIABLE) out.push(w.fields.VARIABLE[0]);\n      for (const x of Object.values(w.inputs || {})) varNames(x, out);",
  "      if (w.fields && w.fields.VARIABLE) out.push(w.fields.VARIABLE[0]);\n      if (w.opcode === 'argument_reporter_string_number' && w.fields && w.fields.VALUE) out.push(w.fields.VALUE[0]);\n      for (const x of Object.values(w.inputs || {})) varNames(x, out);");
s = s.split('P417').join('P418');
fs.writeFileSync('_work/v41/p418.txt', s);
console.log('wrote p418.txt');