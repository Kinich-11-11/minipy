class E4(Exception):
    pass
try:
    raise E4(5, 'why')
except E4 as e:
    print(str(e), e.args if hasattr(e, 'args') else 'noargs')
