import re
class P:
    def __init__(self):
        self.pat = re.compile(r"(\w+)=(\w+)")
    def first(self, text):
        pat = self.pat
        m = pat.search(text)
        return m.group(1)
p = P()
print(p.first("color=red"))
