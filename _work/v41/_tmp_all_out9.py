def titlecase(s):
    out = []
    for w in s.split(' '):
        if w:
            out.append(w[0].upper() + w[1:].lower())
        else:
            out.append(w)
    return ' '.join(out)
print(titlecase('the great GATSBY was HERE'))
print(titlecase('  spaced   out  '))
