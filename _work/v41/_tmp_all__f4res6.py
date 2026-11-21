def conv(s):
    try:
        x = int(s)
    except ValueError as e:
        y = e
        return y
    return 0
print(conv('x1'))
