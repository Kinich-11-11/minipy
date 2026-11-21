import json
cases = [
 ("pow 3^100 mod 7", "print(pow(3, 100, 7))"),
 ("pow 3^100", "print(pow(3, 100))"),
 ("pow 2^20 mod 7", "print(pow(2, 20, 7))"),
 ("pow 3^30 mod 7", "print(pow(3, 30, 7))"),
 ("pow 3^40 mod 7", "print(pow(3, 40, 7))"),
 ("pow 3^50 mod 7", "print(pow(3, 50, 7))"),
 ("pow 3^60 mod 7", "print(pow(3, 60, 7))"),
 ("pow 2^64 mod 1000", "print(pow(2, 64, 1000))"),
 ("pow 7^77 mod 13", "print(pow(7, 77, 13))"),
]
json.dump([{"name":n,"code":c} for n,c in cases], open("_p3.json","w"), ensure_ascii=False)
