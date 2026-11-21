import time
x = time.time()
y = time.time_ns()
print(y > 1600000000000000000)
print(abs(y / 1000000000 - x) < 86400)
