class MyErr(Exception):
    def __init__(self, code, msg):
        Exception.__init__(self, msg)
        self.code = code
        self.msg = msg
try:
    raise MyErr(400, 'negative')
except MyErr as e:
    print(e.code, e.msg, str(e))
