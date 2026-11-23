log = []
def g():
    try:
        yield "pause"
    except ValueError as e:
        log.append(("caught", type(e).__name__, e.args[0]))
        yield "recovered"
    finally:
        log.append("finally")
it = g()
next(it)
log.append(("throw-return", it.throw(ValueError("boom"))))
try:
    next(it)
except StopIteration:
    log.append("done")
print(log)