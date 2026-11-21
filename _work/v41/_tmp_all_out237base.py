class A:
    def f(self):
        return "A"
class B(A):
    pass
class C(A):
    def f(self):
        return "C"
class D(B,C):
    pass
print(D().f())
