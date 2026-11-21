def leaf(a):
    out.append(a)
def mid(a):
    a = a + ['m']
    leaf(a)
def top(a):
    a = a + ['t']
    mid(a)
    leaf(a)
out = []
top([])
print(out)
