# fixguards2.py -- root-type pre-check reads Types[found] instead of evaluating the
# variable (evaluating instance/self values has frame side effects)
import io

src = io.open('p720.txt', encoding='utf-8', newline='').read()

ROOT_T = "item('Types', VAR('found'))"
ROOT_TYPE_OK = ("OR(EQ(" + ROOT_T + ", txt('H')), OR(EQ(" + ROOT_T + ", txt('Q')), "
  "OR(EQ(" + ROOT_T + ", txt('W')), OR(EQ(" + ROOT_T + ", txt('R')), "
  "OR(EQ(" + ROOT_T + ", txt('P')), OR(EQ(" + ROOT_T + ", txt('U')), EQ(" + ROOT_T + ", txt('CPX'))))))))")

old = """        IFELSE(%FMN_HAS%, [], [
          setV('zdT2', tokAt(argOf('lo'))),
          callProc('lookup %s', [VAR('zdT2')]),
          IF(NOT(EQ(VAR('found'), num(0))), [
            callProc('eval %s %s', [argOf('lo'), argOf('lo')]),
            IF(%ROOT_TYPE_OK%, mkEvalBody())
          ])
        ])"""
assert src.count(old) == 1, 'eval precheck'
src = src.replace(old, """        IFELSE(%FMN_HAS%, [], [
          setV('zdT2', tokAt(argOf('lo'))),
          callProc('lookup %s', [VAR('zdT2')]),
          // the variable's type sits in the parallel Types row -- no evaluation needed
          // (evaluating self/instance values has frame side effects)
          IF(NOT(EQ(VAR('found'), num(0))), [
            IF(%ROOT_TYPE_OK%, mkEvalBody())
          ])
        ])""")

old2 = """      IFELSE(%FMN_HAS%, [], [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(NOT(EQ(VAR('found'), num(0))), [
          callProc('eval %s %s', [argOf('lo'), argOf('lo')]),
          IF(%ROOT_TYPE_OK%, mkMcBody())
        ])
      ])"""
assert src.count(old2) == 1, 'mc precheck'
src = src.replace(old2, """      IFELSE(%FMN_HAS%, [], [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(NOT(EQ(VAR('found'), num(0))), [
          IF(%ROOT_TYPE_OK%, mkMcBody())
        ])
      ])""")

io.open('p720.txt', 'w', encoding='utf-8', newline='\n').write(src)
print('prechecks now read Types rows')
