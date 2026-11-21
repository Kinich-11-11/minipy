a=[('x',3)]
print(sorted([('a',2),('b',1)],key=lambda t:t[1],reverse=True))
b=['aaaa','b','cc']
b.sort(key=len)
print(b)
