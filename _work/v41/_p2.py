import json
cases = [
 ("pow3 small", "print(pow(2,10,1000), pow(3,4,5), pow(5,3,13))"),
 ("pow3 sign", "print(pow(-2,3,5), pow(2,-1,5) if False else 0)"),
 ("ord only", "print(ord('A'))"),
 ("chr only", "print(chr(66))"),
 ("ord ascii", "print(ord('z'))"),
 ("class name", "class A:\n    pass\nprint(A.__name__)"),
 ("obj class name", "print((5).__class__.__name__)"),
 ("str name", "try:\n    int('x')\nexcept ValueError as e:\n    print(str(e))"),
]
json.dump([{"name":n,"code":c} for n,c in cases], open("_p2.json","w"), ensure_ascii=False)
