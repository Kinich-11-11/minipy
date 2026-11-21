try:
    try:
        raise ValueError('i')
    except ValueError as e:
        raise TypeError('o') from e
except TypeError as t:
    print(t.__cause__ is e)
