import json
try:
    json.loads('[1,]')
except ValueError:
    print('invalid')
