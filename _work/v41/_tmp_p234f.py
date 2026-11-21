class N:
    def __init__(self, v, nx=None):
        self.v = v
        self.nx = nx
a = N(1)
b = N(2, a)
c = N(3, b)
d = N(4, c)
a.v = 'ab'
c.nx.nx = a
c.nx.nx.v += 'cd'
print(a.v)
