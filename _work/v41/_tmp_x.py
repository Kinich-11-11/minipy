class P:
    def __repr__(self):
        raise ValueError('repr failed')
p = P()
print('%r' % p)
