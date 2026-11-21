import json
C=[]
def add(n,c,i=None):
    d={"name":n,"code":c.strip("\n")}
    if i: d["inputs"]=i
    C.append(d)

add("bigint add J J","x = 2 ** 100\nprint(x + x)\nprint(x * 2)\nprint(x - x)")
add("bigint aug mul","x = 2 ** 100\ny = x\nx *= 2\nprint(x)\nr = 1\nfor i in range(1, 26):\n    r *= i\n    if i in [20, 21, 22, 24, 25]:\n        print(i, r)")
add("bigint add literal","print((10 ** 25) + (10 ** 25))\nprint((10 ** 25) + 10)\nprint(2 ** 100 + 1)")
add("slice alias with b","a = [1, 2]\nb = a\nc = a[:]\nb.append(3)\nprint(a, b, c)")
add("slice alias rev","a = [1, 2]\nc = a[:]\nb = a\nb.append(3)\nprint(a, c)")
add("augsub call rhs","res = [0, 0]\ndef one():\n    return 1\nres[1] += one()\nprint(res)\nres[0] += int('3') * int('4')\nprint(res)")
add("augsub mult rhs","res = [0, 0]\nres[1] += 3 * 4\nprint(res)\nres[0] += 2 + 5\nprint(res)")
add("subscript plus expr","res = [0, 0]\nres[1] = res[1] + 40\nprint(res)")
add("attr alias exact","class Box:\n    def __init__(self):\n        self.items = []\nbx = Box()\nxs = bx.items\nxs.append(1)\nbx.items.append(2)\nprint(xs, bx.items)")
add("attr alias 2","class Box:\n    def __init__(self):\n        self.items = []\nbx = Box()\nxs = bx.items\nbx.items.append(2)\nxs.append(1)\nprint(xs, bx.items)")
add("input prompt","x = int(input('n? '))\nprint(x + 1)",["41"])
add("input assign only","x = input()\nprint(x)",["hello"])
add("genexp finite gen","def g3():\n    yield 1\n    yield 2\ng = (x * 2 for x in g3())\nprint(next(g), next(g))")
add("genexp listcomp equiv","def g3():\n    yield 1\n    yield 2\nprint([x * 2 for x in g3()])")
with open("_iso216b.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
