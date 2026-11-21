class Vec:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __mul__(self, k):
        return Vec(self.x * k, self.y * k)
    def __str__(self):
        return '(' + str(self.x) + ',' + str(self.y) + ')'
v1 = Vec(1, 2)
print(v1 * 3)
