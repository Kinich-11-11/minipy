log = []
def sub():
    try:
        yield 1
    except ValueError:
        log.append("sub-caught")
        yield 2
    finally:
        log.append("sub-finally")
def outer():
    try:
        yield from sub()
    finally:
        log.append("outer-finally")
it = outer()
next(it)
log.append(("throw-return", it.throw(ValueError("boom"))))
try:
    next(it)
except StopIteration:
    log.append("done")
print(log)
