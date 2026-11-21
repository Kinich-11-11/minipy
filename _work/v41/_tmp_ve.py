try:
    raise ValueError('x') from None
except ValueError as v:
    print(v.__cause__, v.__suppress_context__)
