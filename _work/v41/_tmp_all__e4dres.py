def double_result(f):
    def wrapper(n):
        return f(n) * 2
    return wrapper
def val(n):
    return n + 1
val = double_result(val)
print(val)
print(val(5))
