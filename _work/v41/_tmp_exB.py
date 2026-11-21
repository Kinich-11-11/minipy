def show(fn):
    try:
        fn()
    except Exception as e:
        print("err")
show(lambda: 1 / 0)
show(lambda: int("x"))
show(lambda: [1][5])
show(lambda: {}["k"])
show(lambda: len(1))
show(lambda: "a" + 1)
show(lambda: None.foo)
