class E(Exception):
    def __init__(self, x):
        Exception.__init__(self, x)
e = E(KeyError('x'))
print(e.args, repr(e), str(e))
