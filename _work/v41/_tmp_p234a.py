try:
    raise ExceptionGroup('g', [ValueError('a'), TypeError('b')])
except ExceptionGroup as eg:
    print(eg.message)
    print(len(eg.exceptions))
