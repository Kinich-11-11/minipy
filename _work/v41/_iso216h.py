import json
C=[]
def add(n,c):
    C.append({"name":n,"code":c.strip("\n")})
add("pow2 around 53", """
for k in [50, 51, 52, 53, 54, 55, 60]:
    x = 2 ** k
    print(k, x + x)
""")
add("pow2 53 separate", """
x = 2 ** 53
print(x)
print(x + x)
print(x * 2)
print(x + 1)
""")
add("pow10 large", """
for k in [33, 35, 40, 50]:
    x = 10 ** k
    print(k, x + x)
""")
add("pow3 large", """
for k in [20, 25, 30, 35, 40]:
    x = 3 ** k
    print(k, x + x)
""")
add("big add pattern", """
x = 2 ** 53
y = x + 1
print(x + y)
print(y + y)
""")
with open("_iso216h.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
