// mkprobe229f.cjs -- abs() complex probe
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'abs_lit', code: 'print(abs(3 + 4j))' },
  { name: 'abs_var', code: 'z = 3 + 4j\nprint(abs(z))' },
  { name: 'abs_parts', code: 'z = 1 + 2j\nprint(z.real)\nprint(z.imag)' },
  { name: 'abs_i', code: 'print(abs(1j))' },
  { name: 'abs_neg', code: 'print(abs(-3 - 4j))' }
];
fs.writeFileSync('_work/v41/_probe229f.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
