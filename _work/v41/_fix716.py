# fix716.py -- polarity + debug + clobber fixes for p716.txt
import io

path = 'p716.txt'
src = io.open(path, encoding='utf-8', newline='').read()

def rep(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, tag + ' count=' + str(n)
    src = src.replace(old, new)

rep("""      addTo('Output', JOIN(txt('DBG-EQCH flags='), VAR('rxFlags'))),
""", '', 'dbg-eqch')

rep("""            addTo('Output', JOIN(JOIN(txt('DBG-LOOP rxI='), VAR('rxI')), JOIN(txt(' ch='), chAt(VAR('rxI'), VAR('rxP'))))),
            REPEATU(AND(NOT(GT(VAR('rxI'), lenOf(VAR('rxP')))), NOT(EQ(chAt(VAR('rxI'), VAR('rxP')), txt(')')))), [
              addTo('Output', JOIN(JOIN(txt('DBG-ITER rxI='), VAR('rxI')), JOIN(txt(' ch='), chAt(VAR('rxI'), VAR('rxP'))))),
              IF(EQ(chAt(VAR('rxI'), VAR('rxP')), txt('i')), [
                addTo('Output', txt('DBG-ISI')),
                IF(EQ(MOD(FLOOR(DIV(VAR('rxFlags'), num(2))), num(2)), num(0)), [chgV('rxFlags', num(2)), addTo('Output', txt('DBG-FLAG-SET'))])
              ]),
              chgV('rxI', num(1))
            ]),""",
"""            REPEATU(OR(GT(VAR('rxI'), lenOf(VAR('rxP'))), EQ(chAt(VAR('rxI'), VAR('rxP')), txt(')'))), [
              IF(EQ(chAt(VAR('rxI'), VAR('rxP')), txt('i')), [
                IF(EQ(MOD(FLOOR(DIV(VAR('rxFlags'), num(2))), num(2)), num(0)), [chgV('rxFlags', num(2))])
              ]),
              chgV('rxI', num(1))
            ]),""", 'iloop')

rep("""              REPEATU(AND(NOT(GT(VAR('rxI'), lenOf(VAR('rxP')))), NOT(EQ(chAt(VAR('rxI'), VAR('rxP')), txt('>')))), [
                setV('rxNm', JOIN(VAR('rxNm'), chAt(VAR('rxI'), VAR('rxP')))),
                chgV('rxI', num(1))
              ]),""",
"""              REPEATU(OR(GT(VAR('rxI'), lenOf(VAR('rxP'))), EQ(chAt(VAR('rxI'), VAR('rxP')), txt('>'))), [
                setV('rxNm', JOIN(VAR('rxNm'), chAt(VAR('rxI'), VAR('rxP')))),
                chgV('rxI', num(1))
              ]),""", 'pname')

rep("REPEATU(OR(EQ(VAR('rxQ2'), num(1)), EQ(VAR('rxQ2'), num(2))), [",
    "REPEATU(AND(NOT(EQ(VAR('rxQ2'), num(1))), NOT(EQ(VAR('rxQ2'), num(2)))), [", 'braces')

rep("""                  REPEATU(AND(NOT(GT(VAR('rxJ'), lenOf(argOf('rsbR')))), NOT(EQ(chAt(VAR('rxJ'), argOf('rsbR')), txt('>')))), [
                    setV('rxNm', JOIN(VAR('rxNm'), chAt(VAR('rxJ'), argOf('rsbR')))),
                    chgV('rxJ', num(1))
                  ]),""",
"""                  REPEATU(OR(GT(VAR('rxJ'), lenOf(argOf('rsbR'))), EQ(chAt(VAR('rxJ'), argOf('rsbR')), txt('>'))), [
                    setV('rxNm', JOIN(VAR('rxNm'), chAt(VAR('rxJ'), argOf('rsbR')))),
                    chgV('rxJ', num(1))
                  ]),""", 'gname')

a = src.index("newProc('rxsubst %s %s'")
b = src.index("newProc('rxlist'", a)
seg = src[a:b]
cnt = seg.count('rxOut')
seg = seg.replace('rxOut', 'rxAcc')
src = src[:a] + seg + src[b:]
print('rxsubst rxOut replaced:', cnt)

io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
print('p716 fixed')
