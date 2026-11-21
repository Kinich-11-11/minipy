def squares(n):,    i = 0,    while i < n:,        yield i * i,        i += 1,print(list(squares(6))),g = squares(3),print(next(g), next(g), next(g))
