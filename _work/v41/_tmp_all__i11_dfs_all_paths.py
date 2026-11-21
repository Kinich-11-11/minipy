graph2 = {'a': ['b', 'c'], 'b': ['d'], 'c': ['d', 'e'], 'd': ['f'], 'e': ['f'], 'f': []}
def paths(g, cur, dst, acc, out):
    acc = acc + [cur]
    if cur == dst:
        out.append(acc)
        return
    for nxt in g[cur]:
        paths(g, nxt, dst, acc, out)
out = []
paths(graph2, 'a', 'f', [], out)
print(out)
