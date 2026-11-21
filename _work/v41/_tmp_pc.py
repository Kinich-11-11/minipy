try:
    raise ValueError("bad")
except ValueError as e:
    print(type(e), str(e))
