import json
C=[]
def add(n,c,i=None):
    d={"name":n,"code":c.strip("\n")}
    if i: d["inputs"]=i
    C.append(d)

add("float exp 1.5e300","print(1.5e300)\nprint(1e300)\nprint(2.5e10)\nprint(1.5e3)")
add("float nan","print(float('nan') == float('nan'))\nprint(float('nan') < 1, float('nan') > 1)")
add("float integral print","print(1e15)\nprint(float(3))\nprint(1e16 + 0.0)")
add("bigint mul small","x = 2 ** 100\nprint(x * 2)\nprint(2 * x)\nprint(x * 10)\nprint(x + x)")
add("fact step","r = 1\nfor n in [10, 20, 25]:\n    r = 1\n    i = n\n    while i > 1:\n        r *= i\n        i -= 1\n    print(n, r)")
add("list slice copy","a = [1, 2]\nc = a[:]\na.append(3)\nprint(c, a)\nb = a[0:2]\na.append(4)\nprint(b)")
add("list copy method","a = [1, 2]\nc = a.copy()\na.append(3)\nprint(c)")
add("counter independence","def counter():\n    c = [0]\n    def inc():\n        c[0] += 1\n        return c[0]\n    return inc\nf = counter()\ng = counter()\nprint(f(), f(), g(), g())")
add("counter list fresh","def mk():\n    a = []\n    return a\na = mk()\nb = mk()\na.append(1)\nprint(a, b)")
add("mullist zero","res = [0] * 5\nprint(res, len(res))\nres[2] += 7\nprint(res)")
add("int char","a = '123'\nprint(int(a[0]), int(a[1]), int(a[2]))")
add("subs aug","res = [0,0,0]\nfor i in range(3):\n    res[i] += i + 1\nprint(res)")
add("muls str min","def f(a, b):\n    res = [0] * (len(a) + len(b))\n    print('len', len(res))\n    print('a0', int(a[0]))\n    res[1] += int(a[0]) * int(b[0])\n    print('res', res)\n    return res\nprint(f('12','34'))")
add("attr alias","class Box:\n    def __init__(self):\n        self.items = []\nb = Box()\nxs = b.items\nxs.append(1)\nprint(xs, b.items)")
add("input basic","x = int(input())\nprint(x + 1)",["41"])
add("input noint","x = input()\nprint('got', x)",["abc"])
add("genexp inf","def nat():\n    n = 0\n    while True:\n        yield n\n        n += 1\nprint(next(nat()))")
add("genexp inf in take","def nat():\n    n = 0\n    while True:\n        yield n\n        n += 1\ndef take(g, k):\n    r = []\n    i = 0\n    while i < k:\n        r.append(next(g))\n        i += 1\n    return r\nprint(take(nat(), 3))")
add("genexp inf expr","def nat():\n    n = 1\n    while True:\n        yield n\n        n += 1\ng = (x * x for x in nat())\nprint(next(g), next(g), next(g))")
with open("_iso216.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
