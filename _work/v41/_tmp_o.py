class N:
    def __init__(self, v, nx=None):
        self.v = v
        self.nx = nx
l = [N(1)]
d = {'k': N(0, N(0, N(0)))}
d['k'].nx.nx.v += 3
print(d['k'].nx.nx.v)
