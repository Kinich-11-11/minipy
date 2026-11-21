def addn(k):
    def deco(f):
        def w(x):
            return f(x) + k
        return w
    return deco
@addn(10)
def inc(x):
    return x
print(inc(5))
