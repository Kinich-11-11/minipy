log = []
def g():
    log.append("entered")
    value = yield "ready"
    log.append(("received", value))
it = g()
try:
    it.send(1)
except TypeError as e:
    log.append(("exc", type(e).__name__))
log.append(("next", next(it)))
print(log)