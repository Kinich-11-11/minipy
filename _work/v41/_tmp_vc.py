class P:
    def __str__(self):
        return 'S1'
    def __repr__(self):
        return 'R1'
p = P()
print(f'{p!r}|{p!s}|{p!r}')
