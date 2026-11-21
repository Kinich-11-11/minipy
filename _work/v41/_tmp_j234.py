class Character:
    def __init__(self, hp, atk):
        self.hp = hp
        self.atk = atk
    def hit(self, other):
        other.hp -= self.atk
        return other.hp <= 0
m = Character(50, 7)
g = Character(40, 5)
print(m.hit(g), g.hp)
