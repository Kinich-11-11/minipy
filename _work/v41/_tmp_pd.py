import re, datetime
class C:
    def __init__(self):
        self.n = 2024
    def get(self):
        return self.n
c = C()
print(datetime.date(c.get(), 1, 1).isoformat())
