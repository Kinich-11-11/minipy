class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
s = 0
for i in range(400):
    p = Point(i, i + 1)
    s = s + p.x + p.y
print(s)