a = 1; b = 2; print(a + b)
a = 1; a += 1; print(a)
def rle(s):
    if not s:
        return ''
    out = ''
    prev = s[0]
    n = 1
    i = 1
    while i < len(s):
        if s[i] == prev:
            n += 1
        else:
            out += prev + str(n)
            prev = s[i]
            n = 1
        i += 1
    return out + prev + str(n)
print(rle('aaabbc'), rle('abc'), rle(''))
