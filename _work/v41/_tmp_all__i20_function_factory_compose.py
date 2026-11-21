def multiplier(k):
    def apply(x):
        return x * k
    return apply
def compose(f, g):
    return lambda x: f(g(x))
double = multiplier(2)
triple = multiplier(3)
both = compose(double, triple)
print(double(5), triple(5), both(5), multiplier(10)(4))
