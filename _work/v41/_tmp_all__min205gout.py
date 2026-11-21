class T9:
    def __init__(self):
        self.parts = []
    def add(self, w):
        self.parts.append(w[0].upper() + w[1:])
        return self
t9 = T9()
t9.add('hi')
print(t9.parts)
