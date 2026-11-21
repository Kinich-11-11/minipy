class Character:
    def __init__(self, hp, atk):
        self.hp = hp
        self.atk = atk
    def hit(self, other):
        other.hp -= self.atk
        return other.hp <= 0
class Mage(Character):
    def __init__(self, hp, atk, mana):
        Character.__init__(self, hp, atk)
        self.mana = mana
    def fireball(self, other):
        self.mana -= 10
        dmg = self.atk * 2
        other.hp -= dmg
        return other.hp <= 0
m = Mage(50, 7, 30)
g = Character(40, 5)
print(m.hit(g), g.hp)
print(m.fireball(g), g.hp, m.mana)
