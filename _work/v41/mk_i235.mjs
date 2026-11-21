// Isolate the regex-class parse issue.
import fs from 'fs';
const NL = String.fromCharCode(10);
const cases = [
  { name: 'rx_class_list', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12'))${NL}print([m.group(2) for m in ms])` },
  { name: 'rx_plain_map', code: `import re${NL}ms = list(re.finditer(r'ab-', 'ab-12'))${NL}print(list(map(lambda m: m.group(0), ms)))` },
  { name: 'rx_class_map', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12'))${NL}print(list(map(lambda m: m.group(2), ms)))` },
  { name: 'rx_class_compr', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))${NL}print([m.group(2) for m in ms])` },
];
fs.writeFileSync('_work/v41/_probe_i235.json', JSON.stringify(cases, null, 1));
console.log('ok');
