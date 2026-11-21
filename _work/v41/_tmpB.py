class C:
    def __init__(self, n): self.n = n
    def __len__(self): return 3
    def __getitem__(self, i): return i * 2
c = C(1)
print(len(c), c[2])
