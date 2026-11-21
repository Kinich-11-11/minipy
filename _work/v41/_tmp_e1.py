class E:
    pass
try:
    raise E('m')
except E as e:
    print(type(e) == E)
