// dbg probe: f'{p}' empty spec vs f'{p:x}'.
import fs from 'fs';
const NL = String.fromCharCode(10);
const Q = String.fromCharCode(39);
const cls = 'class P:' + NL + '    def __format__(self, spec):' + NL + '        return ' + Q + '[' + ' + spec + ' + ']' + Q + NL + 'p = P()';
const cases = [
  { name: 'fs_empty', code: cls + NL + 'print(f' + Q + '{p}' + Q + ')' },
  { name: 'fs_x', code: cls + NL + 'print(f' + Q + '{p:x}' + Q + ')' },
];
fs.writeFileSync('_work/v41/_probe_dbg236.json', JSON.stringify(cases, null, 1));
console.log('ok');
