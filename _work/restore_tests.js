
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const files = {
  'v_dbg_notin.py': "s = 'Python'\nprint('zzz' not in s)\nprint('tho' not in s)\nprint('zzz' in s)\nx = 'zzz' not in s\nprint(x)\nif 'zzz' not in s:\n    print('A')\nprint('B' + str(x))",
  'v_err1.py': "a, b = 1, 2, 3\nprint('never')",
  'v_err2.py': "s = 'abc'\nprint(s[9])\nprint('never')",
  'v_err3.py': "print(ord('ab'))",
  'v_err4.py': "print(pow(2, 1.5))"
};
for (const [n, c] of Object.entries(files)) { fs.writeFileSync(dir + n, c); console.log('wrote', n); }
