// mkprobe231e.cjs -- do OLD instance attrs work in binops? (is the two-stop problem
// specific to my new dispatch?)
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'inst_binop', code: R`class P:
    def __init__(self, x):
        self.x = x
a = P(3)
b = P(4)
print(a.x + b.x)` },
  { name: 'inst_binop_meth', code: R`class P:
    def __init__(self, x):
        self.x = x
    def get(self):
        return self.x
a = P(3)
b = P(4)
print(a.get() + b.get())` },
  { name: 'list_len_binop', code: R`xs = [1, 2]
ys = [3]
print(len(xs) - len(ys))` },
  { name: 'str_upper_binop', code: R`a = "ab"
b = "c"
print(len(a + b) - len(b))` }
];
fs.writeFileSync('_work/v41/_probe231e.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
