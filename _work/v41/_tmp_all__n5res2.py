def rle_enc(s):
    if s == '':
        return ''
    out = ''
    run = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            run += 1
        else:
            out += str(run) + s[i - 1]
            run = 1
    return out + str(run) + s[-1]
def rle_dec(s):
    out = ''
    i = 0
    while i < len(s):
        n = ''
        while s[i].isdigit():
            n += s[i]
            i += 1
        out += s[i] * int(n)
        i += 1
    return out
print(rle_enc('aaabbbccccd'), rle_dec('3a4b2c'), rle_dec(rle_enc('zzzxy')))
