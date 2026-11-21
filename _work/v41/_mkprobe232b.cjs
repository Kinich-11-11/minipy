// mkprobe232b.cjs -- chain variants isolation
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'mod_chain_group', code: R`import re
print(re.search(r"\d+", "a12b").group())` },
  { name: 'var_chain', code: R`import re
m = re.search(r"(\d+)", "a12b")
print(m.group())` },
  { name: 'paren_chain_group', code: R`import re
print((re.search(r"\d+", "a12b")).group())` },
  { name: 'cls_chain', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"(\w+)=(\w+)")
    def first(self, text):
        return self.pat.search(text).group(1)
p = P()
print(p.first("color=red"))` },
  { name: 'nested_next', code: R`import re
for m in re.finditer(r"\d+", "a1b22"):
    print(m.group())` }
];
fs.writeFileSync('_work/v41/_probe232b.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
