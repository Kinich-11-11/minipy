log = []
def g():
    try:
        yield "pause"
    except GeneratorExit:
        log.append("caught")
        raise
    finally:
        log.append("finally")
it = g()
next(it)
it.close()
log.append("closed")
print(log)