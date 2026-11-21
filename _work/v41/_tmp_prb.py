e = ValueError('old')
e.args = ('new', 42)
print(e.args, str(e), repr(e))
