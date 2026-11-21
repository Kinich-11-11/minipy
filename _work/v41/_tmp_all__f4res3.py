def raise_it(s):
    return int(s)
def conv(s):
    try:
        return raise_it(s)
    except ValueError as e:
        print(e)
print(conv('x1'))
