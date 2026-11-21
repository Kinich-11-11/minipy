def safe(n):
    try:
        return 10 // n
    except ZeroDivisionError:
        return -1
print(safe(2), safe(0))
