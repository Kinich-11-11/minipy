class P:
    def __init__(self, v):
        self.v = v
    def name(self):
        return 'P' + str(self.v)
def f():
    return P(7)
print(f().name())
print(f().name().upper())
