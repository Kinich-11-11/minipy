class E9b:
    def __init__(self):
        self.parts = []
    def add(self, w):
        self.parts.append(w[0].upper())
        return self
t = E9b()
t.add('hi')
print(t.parts)
