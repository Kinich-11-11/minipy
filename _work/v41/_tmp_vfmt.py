class P:
    def __format__(self, spec):
        return '<' + ascii(spec) + '>'
p = P()
print(format(p, 'q'))
