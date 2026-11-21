def box(w, h=1, ch='*', fill=False):
    return (w, h, ch, fill)
print(box(1), box(1, 2), box(1, 2, '#'), box(1, 2, '#', True))
