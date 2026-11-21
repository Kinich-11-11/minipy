class W:
    def __init__(self):
        self.l = None
        self.r = None
    def setr(self):
        self.r = 'R'
    def setl_then_r(self):
        self.l = 'L'
        self.setr()
w = W()
w.setl_then_r()
print(w.l, w.r)
