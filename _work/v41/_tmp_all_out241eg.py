try:
    raise ValueError('v')
except* ValueError as e:
    print(type(e).__name__)
try:
    print(e)
except NameError:
    print('deleted')
