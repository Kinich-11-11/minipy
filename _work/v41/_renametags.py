# renametags.py -- single-char type tags for the list-row protocol
import io

jobs = {
    'p13.txt':  [("txt('DTT')", "txt('Q')"), ("txt('DT')", "txt('H')")],
    'p138.txt': [("txt('DTT')", "txt('Q')"), ("txt('DT')", "txt('H')")],
    'p714.txt': [("txt('ST')", "txt('U')")],
    'p715.txt': [("txt('DTT')", "txt('Q')"), ("txt('DT')", "txt('H')"), ("txt('TD')", "txt('W')")],
    'p716.txt': [("txt('MT')", "txt('R')"), ("txt('RXP')", "txt('P')")],
    'p720.txt': [("txt('DTT')", "txt('Q')"), ("txt('DT')", "txt('H')"), ("txt('TD')", "txt('W')"),
                 ("txt('ST')", "txt('U')"), ("txt('MT')", "txt('R')"), ("txt('RXP')", "txt('P')")],
}
for f, pairs in jobs.items():
    src = io.open(f, encoding='utf-8', newline='').read()
    total = 0
    for old, new in pairs:
        n = src.count(old)
        total += n
        src = src.replace(old, new)
    io.open(f, 'w', encoding='utf-8', newline='\n').write(src)
    print(f, 'replaced', total)
