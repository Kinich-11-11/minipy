try:
    int('x1')
except ValueError as e:
    print(e)
    print('bad:' + str(e))
