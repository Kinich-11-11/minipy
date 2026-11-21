try:
    try:
        try:
            raise ValueError('deep')
        except ValueError as e:
            raise TypeError('mid') from e
    except TypeError as m:
        raise KeyError('top') from m
except KeyError as k:
    print(k.__cause__.__cause__)
    print(repr(k.__cause__.__cause__))
    print(str(k.__cause__.__cause__))
    print(k.__cause__.__cause__.__cause__)
    print(k.__cause__.__cause__.__suppress_context__)
    print(k.__cause__.__suppress_context__)
    print(k.__cause__.__context__.args)
    print(k.__context__.__context__.args)
