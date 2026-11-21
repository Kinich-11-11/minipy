import json, io, sys, contextlib
cases = json.load(open(r'D:\编程\scratch\ai\minipython\_work\analyze_sb3\cases.json', encoding='utf-8'))
res = {}
for c in cases:
    buf = io.StringIO()
    err = ''
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(c['code'], '<t>', 'exec'), {'__name__': '__main__'})
    except BaseException as e:
        err = type(e).__name__ + ': ' + str(e)
    res[c['name']] = {'out': buf.getvalue().split('\n'), 'err': err}
json.dump(res, open(r'D:\编程\scratch\ai\minipython\_work\analyze_sb3\expected.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(res))
