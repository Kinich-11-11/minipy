import json
C=[]
def add(n,c):
    C.append({"name":n,"code":c.strip("\n")})
add("carry small", "print(123456789 + 123456789)\nprint(999999 + 1)\nprint(987654321 + 123456789)")
add("carry medium", "print(9007199254740992 + 9007199254740992)\nprint(99999999999999999999 + 1)\nprint(12345678901234567890 + 98765432109876543210)")
add("carry via vars", "a = 9007199254740992\nb = 9007199254740992\nprint(a + b)\nprint(a - b)")
add("borrow sub", "print(10 ** 25 - 1)\nprint(10000000000000000000000000 - 9999999999999999999999999)")
add("bigint add 3 terms", "a = 2 ** 80\nprint(a + a + a)\nprint(a * 3)")
with open("_iso216f.json","w",encoding="utf-8") as f: json.dump(C,f,ensure_ascii=False)
print(len(C))
