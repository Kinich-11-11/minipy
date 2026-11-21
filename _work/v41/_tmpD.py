class B:
    def b(self):
        return 'b'
class C(B):
    pass
print(C().b())
