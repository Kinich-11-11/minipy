def make():
    n = 0
    def inc():
        return n + 1
    return inc
print(make()())
