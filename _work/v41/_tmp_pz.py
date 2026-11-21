class P:
    def __str__(self):
        return 'SS'
    def __repr__(self):
        return 'RR'
p = P()
print('%r' % p)
print('%s' % p)
