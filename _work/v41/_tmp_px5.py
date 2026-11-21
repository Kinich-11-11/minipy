import cmath
def f(a,b,c):
    d = cmath.sqrt(b**2 - 4*a*c)
    return (-b + d) / (2*a), (-b - d) / (2*a)
x, y = f(1,2,5)
print(x, y)
