log=[]
def g():
    log.append("entered")
    yield "ready"
it=g()
log.append(("next",next(it)))
print(log)
