// Generate _probe_e235.json (escaping done in a file, not shell).
import fs from 'fs';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const cases = [
  { name: 'ascii_builtin_exists', code: `print(ascii('a${BS}nb'))` },
  { name: 'fstring_a_ascii', code: `v = 'a${BS}nb'${NL}print(f'{v!a}')` },
  { name: 'repr_ctrl', code: `print(repr('a${BS}nb${BS}t'))` },
  { name: 'pct_a_ascii', code: `print('%a' % 'a${BS}nb')` },
  { name: 'pct_r_ctrl', code: `print('%r' % 'a${BS}nb')` },
  { name: 'input_ascii_echo', code: `s = input()${NL}print(ascii(s))`, inputs: ['hi there'] },
  { name: 'input_nonascii_repr', code: `s = input()${NL}print(repr(s))`, inputs: ['héllo'] },
  { name: 'input_nonascii_ascii', code: `s = input()${NL}print(ascii(s))`, inputs: ['héllo'] },
  { name: 'input_nonascii_idx', code: `s = input()${NL}print(len(s), s[1])`, inputs: ['héllo'] },
  { name: 'fstring_a_nonascii', code: `s = input()${NL}print(f'{s!a}')`, inputs: ['héllo'] },
  { name: 'pct_a_nonascii', code: `s = input()${NL}print('%a' % s)`, inputs: ['héllo'] },
  { name: 'format_a_nonascii', code: `s = input()${NL}print(format(s, 'a'))`, inputs: ['héllo'] },
];
fs.writeFileSync('_work/v41/_probe_e235.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
