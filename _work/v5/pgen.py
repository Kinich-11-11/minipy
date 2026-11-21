import json, io, contextlib
cases = json.load(open(r'D:/编程/scratch/ai/minipython/_work/v5/diagP.json', encoding='utf-8'))
for c in cases:
    buf = io.StringIO(); err=''
    try:
        with contextlib.redirect_stdout(buf): exec(compile(c['code'], '<c>', 'exec'), {'__name__':'__main__'})
    except Exception as ex: err = type(ex).__name__
    print(c['name'], json.dumps(buf.getvalue().split(chr(10))[:-1] if buf.getvalue() else []), err)