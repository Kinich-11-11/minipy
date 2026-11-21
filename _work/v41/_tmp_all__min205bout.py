class E8(Exception):
    def __init__(self, code, msg):
        self.code = code
        self.msg = msg
try:
    raise E8(400, 'bad')
except E8 as e:
    print(e.code, e.msg, str(e))
