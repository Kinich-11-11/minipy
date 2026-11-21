# leading comment

x = 1  # trailing comment

# another

if x:  # condition comment
    # body comment
    y = 2

    print(x + y)
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
