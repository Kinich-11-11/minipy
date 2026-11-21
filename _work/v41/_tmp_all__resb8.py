print(0 or 'x', '' or [], 1 and 2, None and 1, 0 and 1, 'a' or 'b')
print([] or [1], {'a': 1} and 'yes', None or 0 or 'last')
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
