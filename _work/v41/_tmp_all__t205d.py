def partial(fn, *fixed):
    def applied(*rest):
        all_args = []
        for a in fixed:
            all_args.append(a)
        for a in rest:
            all_args.append(a)
        return fn(all_args)
    return applied
def mysum(args):
    return sum(args)
f = partial(mysum, 1, 2)
print(f(3, 4), f(), f(100))
