class E5(Exception):
    pass
try:
    raise E5('only')
except E5 as e2:
    print(e2.args)
