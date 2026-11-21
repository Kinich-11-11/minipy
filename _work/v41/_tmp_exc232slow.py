original = ValueError("old", 1)
old_args = original.args
try:
    try:
        raise original
    except ValueError as e:
        e.args = (None, [2, 3])
        print("changed", e.args, str(e), repr(e))
        raise
except ValueError as again:
    print("same", again is original, again.args[0] is None)
    print("reraised", again.args, str(again), repr(again))
print("saved", old_args)
