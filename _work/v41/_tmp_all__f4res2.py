def conv(s):
    return int(s)
try:
    conv('x1')
except ValueError as e:
    print(e)
