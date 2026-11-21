def a():
    return 'a'
fns = [a]
print([g() for g in map(lambda f: f, fns)])
