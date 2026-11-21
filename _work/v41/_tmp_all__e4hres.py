def mk(k):
    def ap(x):
        return x * k
    return ap
g = mk(3)
print(g(4))
