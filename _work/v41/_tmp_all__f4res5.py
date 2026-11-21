def conv(s):
    try:
        return int(s)
    except ValueError as e:
        return e
print(conv('x1'))
