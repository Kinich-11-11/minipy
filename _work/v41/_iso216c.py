import json
C=[]
def add(n,c):
    C.append({"name":n,"code":c.strip("\n")})

add("J add variants","a = 10 ** 25\nb = 10 ** 25\nprint(a + b)\nprint((10 ** 25) + (10 ** 25))\nc = a\nprint(c + a)\nprint(a + 10 ** 25)\nprint(a + 1)\nprint(a + a)")
add("J mul variants","a = 10 ** 25\nprint(a * 2)\nprint(a * a)\nprint(a * 10)\nprint((10 ** 25) * 3)")
add("J sub","a = 10 ** 25\nprint(a - 1)\nprint(a - a)\nprint(a - 10 ** 24)")
add("float lit forms","print(1.5e3, 2.5e10, 1.5e300, 1.25e-10)\nprint(1E5, 1.0E5, .5, 5.)\nprint(1e5, 1e10, 1.5e2)")
add("nan inf","n = float('nan')\nprint(n == n, n != n)\nprint(n < 0, n > 0, n == 0)\ni = float('inf')\nprint(i > 1e308, i == i, i - i)")
add("closure list freshness","def mk():\n    a = []\n    a.append(1)\n    return a\nx = mk()\ny = mk()\nprint(x, y)\ndef mk2(n):\n    d = {}\n    d['n'] = n\n    return d\np = mk2(1)\nq = mk2(2)\nprint(p, q)")
add("closure tuple freshness","def mk():\n    t = (1, 2)\n    return t\na = mk()\nb = mk()\nprint(a, b)")
add("augsub method rhs","res = [0, 0]\ns = 'ab'\nres[1] += len(s)\nprint(res)\nres[0] += s.count('a')\nprint(res)")
add("augsub func rhs 2","res = [5, 5]\ndef f(v):\n    return v + 1\nres[0] += f(10)\nprint(res)\nres[1] += (lambda: 3)()\nprint(res)")
add("slice copy pair","a = [1, 2]\nb = a\nc = a[:]\nc.append(9)\nprint(a, b, c)\nc2 = list(a)\nc2.append(8)\nprint(a, c2)")
add("attr alias writers","class B:\n    def __init__(self):\n        self.v = []\nb = B()\nx = b.v\nb.v.append(1)\nx.append(2)\nprint(x, b.v)\nprint(x is b.v if False else 'na')")
with open("_iso216c.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
