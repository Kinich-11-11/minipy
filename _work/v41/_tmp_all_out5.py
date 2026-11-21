class Engine:
    def __init__(self, power):
        self.power = power
    def start(self):
        return 'vroom ' + str(self.power)
class Car:
    def __init__(self, brand, power):
        self.brand = brand
        self.engine = Engine(power)
    def drive(self):
        return self.brand + ': ' + self.engine.start()
c = Car('tesla', 100)
print(c.drive())
print(c.engine.power)
