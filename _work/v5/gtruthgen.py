import json, io, contextlib, sys
cases = json.load(open(r'D:/编程/scratch/ai/minipython/_work/v5/gtest.json', encoding='utf-8'))
truth = {}
for c in cases:
    buf = io.StringIO()
    err = ''
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(c['code'], '<c>', 'exec'), {'__name__': '__main__'})
    except Exception as ex:
        err = type(ex).__name__ + ': ' + str(ex)
    out = buf.getvalue().split(chr(10))
    while out and out[-1] == '': out.pop()
    truth[c['name']] = {'out': out, 'err': err}
json.dump(truth, open(r'D:/编程/scratch/ai/minipython/_work/v5/gtruth.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('cases', len(truth))