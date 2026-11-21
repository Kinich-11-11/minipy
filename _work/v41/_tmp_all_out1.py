def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
def lcm(a, b):
    return a * b // gcd(a, b)
print(gcd(48, 36), gcd(17, 5), lcm(4, 6), lcm(21, 6), gcd(0, 7))
