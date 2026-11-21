class P:
    def __format__(self, spec):
        return '[ + spec + ]'
p = P()
print(f'{p:x}')
