class Bag:
    def __init__(self, items):
        self.items = items
    def __len__(self):
        return len(self.items)
    def __contains__(self, x):
        return x in self.items
bg = Bag([1, 2, 3])
print(len(bg), 2 in bg, 9 in bg)
print(len(Bag([])), 'x' in Bag(['x', 'y']))
