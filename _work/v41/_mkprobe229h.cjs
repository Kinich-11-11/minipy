// mkprobe229h.cjs -- instance attr/method probes
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'attr_only', code: R`class S:
    def __init__(self):
        self.items = []
s = S()
print(s.items)` },
  { name: 'attr_method', code: R`class S:
    def __init__(self):
        self.items = []
    def push(self, x):
        self.items.append(x)
        return self
s = S()
s.push(1)
print(s.items)` },
  { name: 'self_chain', code: R`class S:
    def __init__(self):
        self.items = []
    def add(self, x):
        self.items.append(x)
        return self
    def t(self):
        return '-'.join(self.items)
s = S()
print(s.add('a').add('b').t())` }
];
fs.writeFileSync('_work/v41/_probe229h.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
