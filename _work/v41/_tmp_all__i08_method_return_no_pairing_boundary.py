class Box:
    def __init__(self):
        self.items = []
    def put(self):
        return self.items
bx = Box()
xs = bx.put()
xs.append(1)
print(bx.items)
