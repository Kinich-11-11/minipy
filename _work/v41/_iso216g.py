import json
C=[]
def add(n,c):
    C.append({"name":n,"code":c.strip("\n")})
add("add powers2 sweep", """
for k in [10, 16, 20, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 50, 52]:
    x = 2 ** k
    print(k, x + x, x * 2)
""")
add("add generic sweep", """
for k in [10, 15, 16, 17, 18, 19, 20]:
    x = 3 ** k
    print(k, x + x, x * 2)
""")
with open("_iso216g.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
