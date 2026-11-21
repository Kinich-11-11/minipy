import json
C=[]
def add(n,c):
    C.append({"name":n,"code":c.strip("\n")})

add("bigint add powers10 20-32", """
for k in [20, 24, 25, 26, 27, 28, 30, 31, 32]:
    x = 10 ** k
    print(k, x + x)
""")
add("bigint add powers2", """
for k in [53, 60, 80, 90, 100, 110]:
    x = 2 ** k
    print(k, x + x)
""")
add("bigint add mixed", """
a = 2 ** 100
b = 10 ** 30
print(a + b)
print(b + b)
print(b - b)
print(b * 2)
""")
add("two counters list", """
def counter():
    c = [0]
    def inc():
        c[0] += 1
        return c[0]
    return inc
f = counter()
g = counter()
print(f(), g(), f(), g())
""")
add("two counters nonlocal int", """
def counter():
    n = 0
    def inc():
        nonlocal n
        n += 1
        return n
    return inc
f = counter()
g = counter()
print(f(), g(), f(), g())
""")
add("closure capture global name", """
def mk():
    a = []
    return a
a = mk()
b = mk()
a.append(1)
print(a, b)
""")
add("closure capture diff name", """
def mk():
    a = []
    return a
x = mk()
y = mk()
x.append(1)
print(x, y)
""")
add("local name collides caller", """
def mk():
    a = [1]
    return a
a = mk()
c = mk()
c.append(2)
print(a, c)
""")
with open("_iso216e.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
