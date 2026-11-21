def outer():
    x = 'o'
    def middle():
        nonlocal x
        def inner():
            nonlocal x
            x = 'i'
        inner()
        return x
    r = middle()
    return x, r
print(outer())
