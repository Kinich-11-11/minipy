class P:
    pattern='abc'
    re='xyz'
def f():
    print('once')
    return P()
print((f()).pattern)
print((f()).re)
