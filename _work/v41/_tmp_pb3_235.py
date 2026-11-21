class N:
    def __init__(self, v, nx=None):
        self.v=v
        self.nx=nx
n=N(1,N(2))
def f():
    return n
f().nx.v = 7
print(n.nx.v)
