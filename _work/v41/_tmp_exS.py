def show(fn):
    try:
        fn()
    except Exception as e:
        print("err")
show(lambda: len(1))
