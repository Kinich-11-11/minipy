// mkprobe231i.cjs -- dotted receiver dispatch variants
const fs = require('fs');
const R = String.raw;
const cases = [
  { name: 'dotted_attr_only', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"\d+")
    def txt(self):
        return self.pat
p = P()
print(p.txt())` },
  { name: 'dotted_call_findall', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"\d+")
    def all(self, s):
        return self.pat.findall(s)
p = P()
print(p.all("a1b22"))` },
  { name: 'dotted_call_search_var', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"(\d+)")
    def first(self, s):
        m = self.pat.search(s)
        return m.group(1)
p = P()
print(p.first("x42y"))` },
  { name: 'dotted_call_on_self', code: R`import re
class P:
    def __init__(self, s):
        self.s = s
    def run(self):
        return re.search(r"\d+", self.s)
p = P("x7y")
print(p.run())` },
  { name: 'local_pattern', code: R`import re
class P:
    def __init__(self):
        self.pat = re.compile(r"(\w+)=(\w+)")
    def first(self, text):
        pat = self.pat
        m = pat.search(text)
        return m.group(1)
p = P()
print(p.first("color=red"))` }
];
fs.writeFileSync('_work/v41/_probe231i.json', JSON.stringify(cases, null, 1));
console.log('written', cases.length);
