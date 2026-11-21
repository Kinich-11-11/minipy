import json, io, sys, contextlib
src, dst = sys.argv[1], sys.argv[2]
cases = json.load(open(src, encoding='utf-8'))
res = {}
for c in cases:
    buf = io.StringIO(); err = ''
    g = {'__name__': '__main__'}
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(c['code'], '<t>', 'exec'), g)
    except BaseException as e:
        err = type(e).__name__ + ': ' + str(e)
    res[c['name']] = {'out': buf.getvalue().split('\n'), 'err': err}
json.dump(res, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('truth', len(res), '->', dst)
