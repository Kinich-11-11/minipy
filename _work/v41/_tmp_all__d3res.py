class Str:
    def __init__(self):
        self.n = ''
    def add(self, s):
        self.n = self.n + s
        return self
    def text(self):
        return self.n
print(Str().add('a').add('b').text())
