def make():
    x = 1
    def get():
        return x
    return get
print(make()())
