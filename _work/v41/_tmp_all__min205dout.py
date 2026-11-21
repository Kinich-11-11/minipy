def fl2(x):
    out = []
    for item in x:
        if isinstance(item, list):
            inner = fl2(item)
            for sub in inner:
                out.append(sub)
        else:
            out.append(item)
    return out
print(fl2([1, [2, [3, 4]], 5]))
